import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { 
  Box, Button, Typography, Paper, FormControlLabel, Radio, 
  RadioGroup, CircularProgress, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, Autocomplete,
  Checkbox, Chip, FormControl, InputLabel, MenuItem, Select,
  createTheme, ThemeProvider 
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#121212', paper: '#1e1e1e' },
    text: { primary: '#ffffff', secondary: '#b3b3b3' },
    divider: '#424242'
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  }
});

const processSheetData = (sheetData, fileType) => {
  const results = [];
  const materialsSet = new Set();

  sheetData.forEach(row => {
    const entry = { materiales: [] };
    
    const filteredRow = Object.keys(row).reduce((acc, key) => {
      if (key !== 'A' && !key.startsWith('0')) {
        acc[key] = row[key]
      }
      return acc;
    }, {});
    if (fileType === 'modernizacion') {
      entry.ot = row['2.Nro de O.T.'] || '';
      entry.nodo = row['1.NODO DEL POSTE.'] || '';
      
      // Procesar materiales modernización
      for (let i = 1; i <= 10; i++) {
        const material = row[`MATERIAL ${i}`] || row[`Material ${i}`];
        const cantidad = row[`CANTIDAD MATERIAL ${i}`] || row[`CANTIDAD DE MATERIAL ${i}`];
        
        if (material && cantidad) {
          const materialKey = material.toString().toUpperCase().trim();
          entry.materiales.push({
            nombre: materialKey,
            cantidad: parseFloat(cantidad) || 0
          });
          materialsSet.add(materialKey);
        }
      }
    } else {
      entry.ot = row['6.Nro.Orden Energis'] || '';
      entry.nodo = row['5.Nodo'] || '';
      
      // Procesar materiales mantenimiento
      for (let i = 1; i <= 10; i++) {
        const material = row[`MATERIAL ${i}`];
        const cantidad = row[`CANTIDAD MATERIAL ${i}`];
        
        if (material && cantidad) {
          const materialKey = material.toString().toUpperCase().trim();
          entry.materiales.push({
            nombre: materialKey,
            cantidad: parseFloat(cantidad) || 0
          });
          materialsSet.add(materialKey);
        }
      }
    }
    
    results.push(entry);
  });

  return {
    processedData: results,
    materials: Array.from(materialsSet).sort()
  };
};

const FileUploader = () => {
  const [files, setFiles] = useState([]);
  const [fileType, setFileType] = useState('modernizacion');
  const [processedData, setProcessedData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [filters, setFilters] = useState({
    nodo: '',
    ot: '',
    ordenEnergis: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setFiles([file]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      const { processedData, materials } = processSheetData(jsonData, fileType);
      setProcessedData(processedData);
      setMaterialsList(materials);
      setPreviewData(jsonData.slice(0, 5)); 
    };
    reader.readAsArrayBuffer(file);
  }, [fileType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: '.xlsx',
    multiple: false
  });

  const processFiles = async () => {
    setIsProcessing(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('tipo_archivo', fileType);

    try {
      const response = await axios.post('https://frontendfastapi.duckdns.org/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'resultado.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error:', error);
    }
    setIsProcessing(false);
  };
  
  const filteredData = processedData.filter(item => {
    const matchesNodo = item.nodo?.toString().includes(filters.nodo);
    const matchesOT = item.ot?.toString().includes(filters.ot);
    const matchesMaterial = selectedMaterials.length === 0 || 
      item.materiales.some(m => selectedMaterials.includes(m.nombre));
    
    return matchesNodo && matchesOT && matchesMaterial;
  }).slice(0, 10);

  const chartData = filteredData.reduce((acc, item) => {
    item.materiales.forEach(material => {
      const existing = acc.find(m => m.nombre === material.nombre);
      if (existing) {
        existing.cantidad += material.cantidad;
      } else {
        acc.push({ ...material });
      }
    });
    return acc;
  }, []);

   // Función para calcular tamaño dinámico
   const getDynamicStyles = (dataLength) => {
    const baseSize = 800;
    const minHeight = 400;
    const maxBars = 30;
    
    return {
      width: Math.min(baseSize, window.innerWidth - 100),
      height: Math.max(minHeight, dataLength * 20),
      margin: { 
        top: 20, 
        right: dataLength > maxBars ? 10 : 30, 
        left: dataLength > maxBars ? 50 : 20, 
        bottom: 5 
      }
    };
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ 
        maxWidth: 1200, 
        margin: '2rem auto', 
        padding: 3,
        backgroundColor: darkTheme.palette.background.default
      }}>
        <Paper elevation={3} sx={{ 
          padding: 3, 
          mb: 3,
          backgroundColor: darkTheme.palette.background.paper
        }}>
          <Typography variant="h5" gutterBottom sx={{ color: darkTheme.palette.text.primary }}>
            Analizador de Archivos Técnicos
          </Typography>

          <RadioGroup 
            row 
            value={fileType} 
            onChange={(e) => setFileType(e.target.value)}
            sx={{ mb: 3 }}
          >
            <FormControlLabel 
              value="modernizacion" 
              control={<Radio color="primary" />} 
              label="Modernización" 
              sx={{ color: darkTheme.palette.text.primary }}
            />
            <FormControlLabel 
              value="mantenimiento" 
              control={<Radio color="primary" />} 
              label="Mantenimiento"
              sx={{ color: darkTheme.palette.text.primary }}
            />
          </RadioGroup>

          <Box 
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive 
                ? darkTheme.palette.primary.main 
                : darkTheme.palette.divider,
              borderRadius: 2,
              padding: 4,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 3,
              backgroundColor: darkTheme.palette.background.paper
            }}
          >
            <input {...getInputProps()} />
            <Typography variant="body1" sx={{ color: darkTheme.palette.text.primary }}>
              {isDragActive 
                ? '¡Suelta el archivo aquí!' 
                : 'Arrastra un archivo Excel o haz clic para seleccionar'}
            </Typography>
            {files[0] && (
              <Typography variant="caption" sx={{ mt: 1, color: darkTheme.palette.text.secondary }}>
                Archivo seleccionado: {files[0].name}
              </Typography>
            )}
          </Box>

          {previewData.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ color: darkTheme.palette.text.primary }}>
                Vista Previa
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 800}}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {Object.keys(previewData[0])
                      .filter(key => !['A', '0'].includes(key)).map((header, index) => (
                        <TableCell 
                          key={index} 
                          sx={{ 
                            fontWeight: 'bold', 
                            color: darkTheme.palette.text.primary,
                            backgroundColor: darkTheme.palette.background.paper
                          }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.slice(1, 6).map((row, index) => (
                      <TableRow key={index}>
                        {Object.entries(row)
                          .filter(([key]) => !['A', '0'].includes(key))
                          .map(([key, value], cellIndex) => (
                          <TableCell 
                            key={cellIndex}
                            sx={{ color: darkTheme.palette.text.primary }}
                          >
                            {value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

<Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              label="Filtrar por Nodo"
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              onChange={(e) => setFilters(prev => ({ ...prev, nodo: e.target.value }))}
            />
            <TextField
              label="Filtrar por OT"
              variant="outlined"
              size="small"
              sx={{ flex: 1 }}
              onChange={(e) => setFilters(prev => ({ ...prev, ot: e.target.value }))}
            />
            <Autocomplete
              multiple
              options={materialsList}
              value={selectedMaterials}
              onChange={(_, newValue) => setSelectedMaterials(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar Materiales"
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: 300 }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    label={option}
                    size="small"
                    sx={{ m: 0.5 }}
                  />
                ))
              }
            />
          </Box>

          {/* Tabla de Resultados */}
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>OT</TableCell>
                  <TableCell>Nodo</TableCell>
                  <TableCell>Materiales</TableCell>
                  <TableCell>Cantidad Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.ot}</TableCell>
                    <TableCell>{item.nodo}</TableCell>
                    <TableCell>
                      {item.materiales.map((m, i) => (
                        <Chip
                          key={i}
                          label={`${m.nombre} (${m.cantidad})`}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      {item.materiales.reduce((sum, m) => sum + m.cantidad, 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Gráfico Actualizado */}
          <BarChart
            {...getDynamicStyles(chartData.length)}
            data={chartData}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={darkTheme.palette.divider} />
            <XAxis
              dataKey="nombre"
              interval={0}
              angle={chartData.length > 0.5 ? -20 : -90}
              dx={chartData.length > 15 ? -10 : 0}
              dy={chartData.length > 35 ? 15 : 0}
              tick={{
                fontSize: chartData.length > 30 ? 10 : 12,
                fill: darkTheme.palette.text.primary
              }}
              height={chartData.length * 15 + 40}
            />
            <YAxis
              tick={{ fill: darkTheme.palette.text.primary }}
              label={{
                value: 'Cantidad',
                angle: -90,
                position: 'insideLeft',
                fill: darkTheme.palette.text.primary,
                fontSize: 12
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: darkTheme.palette.background.paper,
                borderColor: darkTheme.palette.divider,
                color: darkTheme.palette.text.primary,
                maxWidth: 300
              }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: chartData.length > 30 ? 20 : 0,
                color: darkTheme.palette.text.primary
              }}
            />
            <Bar
              dataKey="cantidad"
              fill={darkTheme.palette.primary.main}
              name="Cantidad"
              barSize={Math.max(10, 40 - (chartData.length * 0.5))}
            />
          </BarChart>

          <Button
            variant="contained"
            color="primary"
            onClick={processFiles}
            disabled={isProcessing || files.length === 0}
            sx={{ width: 200 }}
          >
            {isProcessing ? (
              <CircularProgress size={24} color="inherit" />
            ) : 'Procesar Archivo'}
          </Button>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default FileUploader;