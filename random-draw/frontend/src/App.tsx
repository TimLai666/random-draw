import {useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {PerformSampling} from "../wailsjs/go/main/App";

function App() {
    const [resultText, setResultText] = useState("Please enter your name below 👇");
    const [name, setName] = useState('');
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [samplingType, setSamplingType] = useState<'number' | 'percentage'>('number');
    const [samplingValue, setSamplingValue] = useState('');
    const [hasHeader, setHasHeader] = useState(true);
    const updateName = (e: any) => setName(e.target.value);
    const updateResultText = (result: string) => setResultText(result);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setExcelFile(e.target.files[0]);
        }
    };

    const handleSamplingTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSamplingType(e.target.value as 'number' | 'percentage');
    };

    const handleHasHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHasHeader(e.target.checked);
    };

    const handleSamplingValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSamplingValue(e.target.value);
    };

    const performSampling = async () => {
        if (!excelFile) {
            setResultText("請選擇一個Excel文件");
            return;
        }
        if (!samplingValue) {
            setResultText("請輸入抽樣值");
            return;
        }

        try {
            // Read file as base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Data = (e.target?.result as string).split(',')[1]; // Remove data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,
                const result = await PerformSampling(base64Data, hasHeader, samplingType, parseFloat(samplingValue));
                if (typeof result === 'string') {
                    setResultText(result);
                } else {
                    // Convert data to CSV
                    const csvLines = result.map((row: any[]) => row.join(','));
                    const csvContent = csvLines.join('\n');
                    // Download the result CSV
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'sampled.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                    setResultText("抽樣完成，已下載結果CSV文件");
                }
            };
            reader.readAsDataURL(excelFile);
        } catch (error) {
            setResultText(`錯誤: ${error}`);
        }
    };

    return (
        <div id="App">
            <img src={logo} id="logo" alt="logo"/>
            <div id="result" className="result">{resultText}</div>
            <div className="upload-section">
                <label htmlFor="excel-upload">選擇Excel文件:</label>
                <input id="excel-upload" type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
                <label>
                    <input type="checkbox" checked={hasHeader} onChange={handleHasHeaderChange} />
                    第一行是標題
                </label>
            </div>
            <div className="sampling-section">
                <label htmlFor="sampling-type">抽樣類型:</label>
                <select id="sampling-type" value={samplingType} onChange={handleSamplingTypeChange}>
                    <option value="number">數量</option>
                    <option value="percentage">百分比</option>
                </select>
                <label htmlFor="sampling-value">值:</label>
                <input id="sampling-value" type="number" value={samplingValue} onChange={handleSamplingValueChange} />
                <button className="btn" onClick={performSampling}>開始抽樣</button>
            </div>
        </div>
    )
}

export default App
