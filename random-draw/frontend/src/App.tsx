import {useState} from 'react';
import logo from './assets/images/logo.png';
import './App.css';
import {PerformSampling} from "../wailsjs/go/main/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription,  CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Play } from "lucide-react";

function App() {
    const [resultText, setResultText] = useState("請選擇 Excel 或 CSV 檔案並設定抽樣參數");
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [samplingType, setSamplingType] = useState<'number' | 'percentage'>('number');
    const [samplingValue, setSamplingValue] = useState('');
    const [hasHeader, setHasHeader] = useState(true);
    const [loading, setLoading] = useState(false);
    const [sampledCSV, setSampledCSV] = useState<string | null>(null);
    const [sampledData, setSampledData] = useState<string[][] | null>(null);
    const [headers, setHeaders] = useState<string[] | null>(null);
   
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setExcelFile(e.target.files[0]);
        }
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
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.getHours().toString().padStart(2, '0') + 
                        now.getMinutes().toString().padStart(2, '0');
        a.download = `sampled_${dateStr}_${timeStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const performSampling = async () => {
        console.log("開始抽樣流程...");
        if (!excelFile) {
            setResultText("請選擇一個 Excel 或 CSV 檔案");
            return;
        }
        if (!samplingValue) {
            setResultText("請輸入抽樣值");
            return;
        }

        setLoading(true);
        setSampledData(null);
        setHeaders(null);
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
            const result = await PerformSampling(base64Data, excelFile.name, hasHeader, samplingType, parseFloat(samplingValue));
            console.log("後端返回原始結果:", result);
            
            let data: any[][] | null = null;
            let csvBase64 = "";
            let errMsg = "";
            let resHeaders: string[] = [];

            if (result && typeof result === 'object' && !Array.isArray(result)) {
                // 處理結構體返回
                data = (result as any).array;
                csvBase64 = (result as any).csvContentBase64;
                errMsg = (result as any).error;
                resHeaders = (result as any).headers || [];
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
                setHeaders(resHeaders);
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
        <div className="container mx-auto p-8 max-w-4xl">
            <Card className="mb-8">
                <CardHeader className="text-center">
                    <img src={logo} className="w-32 h-32 mx-auto mb-4" alt="logo"/>
                    <CardTitle className="text-3xl font-bold">隨機抽樣工具</CardTitle>
                    <CardDescription className={resultText.includes("錯誤") ? "text-destructive" : "text-primary"}>
                        {resultText}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">選擇 Excel 或 CSV 檔案</label>
                            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                        </div>
                        <div className="flex items-end space-x-2 pb-2">
                            <Checkbox id="hasHeader" checked={hasHeader} onCheckedChange={(checked) => setHasHeader(!!checked)} />
                            <label htmlFor="hasHeader" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                第一行是標題
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">抽樣類型</label>
                            <Select value={samplingType} onValueChange={(v: any) => setSamplingType(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="選擇類型" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="number">數量</SelectItem>
                                    <SelectItem value="percentage">百分比</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">抽樣值 ({samplingType === 'percentage' ? '%' : '筆'})</label>
                            <Input type="number" value={samplingValue} onChange={handleSamplingValueChange} placeholder="輸入數值" />
                        </div>
                        <Button className="w-full" onClick={performSampling} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            {loading ? '抽樣中...' : '開始抽樣'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {sampledData && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>抽樣結果預覽</CardTitle>
                            <CardDescription>顯示前 10 筆數據</CardDescription>
                        </div>
                        <Button variant="outline" onClick={downloadCSV}>
                            <Download className="mr-2 h-4 w-4" />
                            下載完整 CSV
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {headers && headers.length > 0 ? (
                                            headers.map((header, index) => (
                                                <TableHead key={index}>{header}</TableHead>
                                            ))
                                        ) : (
                                            sampledData[0]?.map((_, index) => (
                                                <TableHead key={index}>欄位 {index + 1}</TableHead>
                                            ))
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sampledData.slice(0, 10).map((row, index) => (
                                        <TableRow key={index}>
                                            {row.map((cell, cellIndex) => (
                                                <TableCell key={cellIndex}>{cell}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {sampledData.length > 10 && (
                            <p className="text-sm text-muted-foreground mt-4 text-center">
                                ... 還有 {sampledData.length - 10} 行數據未顯示
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

export default App
