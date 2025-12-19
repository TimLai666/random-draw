import {useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {PerformSampling} from "../wailsjs/go/main/App";

function App() {
    const [resultText, setResultText] = useState("請選擇 Excel 檔案並設定抽樣參數");
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [samplingType, setSamplingType] = useState<'number' | 'percentage'>('number');
    const [samplingValue, setSamplingValue] = useState('');
    const [hasHeader, setHasHeader] = useState(true);
    const [loading, setLoading] = useState(false);
    const [sampledCSV, setSampledCSV] = useState<string | null>(null);
    const [sampledData, setSampledData] = useState<string[][] | null>(null);
   
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

    const downloadCSV = () => {
        if (!sampledCSV) return;
        const blob = new Blob([Uint8Array.from(atob(sampledCSV), c => c.charCodeAt(0))], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sampled.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const performSampling = async () => {
        console.log("開始抽樣流程...");
        if (!excelFile) {
            setResultText("請選擇一個Excel文件");
            return;
        }
        if (!samplingValue) {
            setResultText("請輸入抽樣值");
            return;
        }

        setLoading(true);
        setSampledData(null);
        setSampledCSV(null);
        setResultText("正在讀取檔案並進行抽樣...");

        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const res = e.target?.result as string;
                    if (!res) {
                        reject("檔案讀取失敗");
                        return;
                    }
                    resolve(res.split(',')[1]);
                };
                reader.onerror = () => reject("檔案讀取出錯");
                reader.readAsDataURL(excelFile);
            });

            console.log("檔案讀取完成，調用後端 PerformSampling...");
            const result = await PerformSampling(base64Data, hasHeader, samplingType, parseFloat(samplingValue));
            console.log("後端返回原始結果:", result);
            
            let data: any[][] | null = null;
            let csvBase64 = "";
            let errMsg = "";

            if (result && typeof result === 'object' && !Array.isArray(result)) {
                // 處理結構體返回
                data = (result as any).array;
                csvBase64 = (result as any).csvContentBase64;
                errMsg = (result as any).error;
            } else if (Array.isArray(result)) {
                // 處理舊版或陣列返回
                [data, csvBase64, errMsg] = result;
            } else {
                throw new Error(`無法解析後端返回格式: ${JSON.stringify(result)}`);
            }
            
            if (errMsg) {
                setResultText(`後端錯誤: ${errMsg}`);
            } else if (data) {
                setSampledCSV(csvBase64);
                setSampledData(data as string[][]);
                setResultText(`抽樣完成，共 ${data.length} 行數據`);
            } else {
                setResultText("抽樣完成，但未獲取到數據");
            }
        } catch (error) {
            console.error("抽樣過程出錯:", error);
            setResultText(`錯誤: ${error}`);
        } finally {
            setLoading(false);
            console.log("抽樣流程結束");
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
                <button className="btn" onClick={performSampling} disabled={loading}>
                    {loading && <div className="spinner"></div>}
                    {loading ? '抽樣中...' : '開始抽樣'}
                </button>
            </div>
            {sampledData && (
                <div className="result-section">
                    <h3>抽樣結果</h3>
                    <table>
                        <tbody>
                            {sampledData.slice(0, 10).map((row, index) => (
                                <tr key={index}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sampledData.length > 10 && <p>... 還有 {sampledData.length - 10} 行</p>}
                    <button className="btn" onClick={downloadCSV}>下載CSV</button>
                </div>
            )}
        </div>
    )
}

export default App
