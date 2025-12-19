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
func (a *App) PerformSampling(fileData string, hasHeader bool, samplingType string, value float64) ([][]any, string) {
	// Decode base64 file data
	data, err := base64.StdEncoding.DecodeString(fileData)
	if err != nil {
		return nil, fmt.Sprintf("Error decoding file: %v", err)
	}

	// Create temp Excel file
	tempExcel, err := os.CreateTemp("", "input_*.xlsx")
	if err != nil {
		return nil, fmt.Sprintf("Error creating temp file: %v", err)
	}
	defer os.Remove(tempExcel.Name())
	defer tempExcel.Close()

	_, err = tempExcel.Write(data)
	if err != nil {
		return nil, fmt.Sprintf("Error writing temp file: %v", err)
	}
	tempExcel.Close()

	// temp dir
	tempDir, err := os.MkdirTemp("", "csvxl_output")
	if err != nil {
		return nil, fmt.Sprintf("Error creating temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	csvxl.ExcelToCsv(tempExcel.Name(), tempDir, []string{"Sheet1"})

	dt := isr.DT.From(isr.CSV{
		FilePath: tempDir + "/Sheet1.csv",
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
	return dt.SimpleRandomSample(int(num)).To2DSlice(), ""
}
