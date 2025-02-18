import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Typography, Paper, FormControlLabel, Radio, RadioGroup, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { theme } from './theme'; // Asume una paleta de colores definida

const FileUploader = () => {
  const [files, setFiles] = useState([]);
  const [fileType, setFileType] = useState('modernizacion');
  const [previewData, setPreviewData] = useState([]);
  const [materialFilter, setMaterialFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setFiles([file]);

    // Leer archivo para previsualización
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      // Mostrar primeras 5 filas
      setPreviewData(jsonData.slice(0, 5)); 
    };
    reader.readAsArrayBuffer(file);
  }, []);

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
      const response = await axios.post('http://18.117.10.185:8000/upload/', formData, {
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

  const filteredMaterials = previewData
    .filter(row => row.material?.toLowerCase().includes(materialFilter.toLowerCase()))
    .slice(0, 5);

  return (
    <Box sx={{ maxWidth: 1200, margin: '2rem auto', padding: 3 }}>
      <Paper elevation={3} sx={{ padding: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Analizador de Archivos Técnicos
        </Typography>

        {/* Selector de Tipo de Archivo */}
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
          />
          <FormControlLabel 
            value="mantenimiento" 
            control={<Radio color="primary" />} 
            label="Mantenimiento" 
          />
        </RadioGroup>

        {/* Zona de Dropzone */}
        <Box 
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? theme.palette.primary.main : '#ccc',
            borderRadius: 2,
            padding: 4,
            textAlign: 'center',
            cursor: 'pointer',
            mb: 3,
            backgroundColor: isDragActive ? '#f5f5f5' : 'white'
          }}
        >
          <input {...getInputProps()} />
          <Typography variant="body1">
            {isDragActive 
              ? '¡Suelta el archivo aquí!' 
              : 'Arrastra un archivo Excel o haz clic para seleccionar'}
          </Typography>
          {files[0] && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
              Archivo seleccionado: {files[0].name}
            </Typography>
          )}
        </Box>

        {/* Previsualización de Datos */}
        {previewData.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Vista Previa (Primeras 5 filas)
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {previewData[0].map((header, index) => (
                      <TableCell key={index} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.slice(1).map((row, index) => (
                    <TableRow key={index}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Análisis de Materiales */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Análisis de Materiales
          </Typography>
          <TextField
            label="Filtrar por material"
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            onChange={(e) => setMaterialFilter(e.target.value)}
          />
          
          <BarChart
            width={800}
            height={400}
            data={filteredMaterials}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="material" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="cantidad" fill={theme.palette.primary.main} />
          </BarChart>
        </Box>

        {/* Botón de Procesamiento */}
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
  );
};

export default FileUploader;