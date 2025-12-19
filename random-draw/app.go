package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"

	"github.com/HazelnutParadise/insyra/csvxl"
	"github.com/HazelnutParadise/insyra/isr"
)

// App struct
type App struct {
	ctx context.Context
}

// SamplingResult represents the result of the sampling process
type SamplingResult struct {
	Array            [][]any  `json:"array"`
	Headers          []string `json:"headers"`
	CSVContentBase64 string   `json:"csvContentBase64"`
	Error            string   `json:"error"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// PerformSampling performs random sampling on Excel data
func (a *App) PerformSampling(fileData string, hasHeader bool, samplingType string, value float64) *SamplingResult {
	fmt.Printf("Backend received: hasHeader=%v, samplingType=%s, value=%f\n", hasHeader, samplingType, value)
	// Decode base64 file data
	data, err := base64.StdEncoding.DecodeString(fileData)
	if err != nil {
		return &SamplingResult{Error: fmt.Sprintf("Error decoding file: %v", err)}
	}

	// Create temp Excel file
	tempExcel, err := os.CreateTemp("", "input_*.xlsx")
	if err != nil {
		return &SamplingResult{Error: fmt.Sprintf("Error creating temp file: %v", err)}
	}
	defer os.Remove(tempExcel.Name())
	defer tempExcel.Close()

	_, err = tempExcel.Write(data)
	if err != nil {
		return &SamplingResult{Error: fmt.Sprintf("Error writing temp file: %v", err)}
	}
	tempExcel.Close()

	// temp dir
	tempDir, err := os.MkdirTemp("", "csvxl_output")
	if err != nil {
		return &SamplingResult{Error: fmt.Sprintf("Error creating temp dir: %v", err)}
	}
	defer os.RemoveAll(tempDir)

	csvxl.ExcelToCsv(tempExcel.Name(), tempDir, []string{"Sheet1"})

	csvPath := tempDir + "/Sheet1.csv"
	if _, err := os.Stat(csvPath); os.IsNotExist(err) {
		fmt.Printf("Error: %s not found\n", csvPath)
		return &SamplingResult{Error: "Error: Sheet1.csv was not created. Please ensure the Excel file has a sheet named 'Sheet1'."}
	}

	dt := isr.DT.From(isr.CSV{
		FilePath: csvPath,
		InputOpts: isr.CSV_inOpts{
			FirstRow2ColNames: hasHeader,
			FirstCol2RowNames: false,
		},
	})

	num := value
	if samplingType == "percentage" {
		numRows, _ := dt.Size()
		num = float64(numRows) * (value / 100)
	}

	sampled := dt.SimpleRandomSample(int(num))
	outputCSVPath := tempDir + "/sampled.csv"
	if err := sampled.ToCSV(outputCSVPath,
		false, hasHeader, true); err != nil {
		return &SamplingResult{Error: fmt.Sprintf("Error writing sampled CSV: %v", err)}
	}

	slice := sampled.To2DSlice()

	csvContent, err := os.ReadFile(outputCSVPath)
	if err != nil {
		return &SamplingResult{Error: fmt.Sprintf("Error reading CSV: %v", err)}
	}

	fmt.Println("Backend finished")
	return &SamplingResult{
		Array: slice, Headers: sampled.ColNames(), CSVContentBase64: base64.StdEncoding.EncodeToString(csvContent),
		Error: "",
	}
}
