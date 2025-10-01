
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdvisorProfile, Meeting, Portfolio, Fund } from "@/api/entities";
import { Gem, Receipt, PlusCircle, Trash2, Edit, DollarSign, LineChart, Download } from 'lucide-react';
import { generateValueAndFeesPdf } from '@/api/functions';
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox import

// Simple UUID generator function
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

const formatCurrencyInput = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numValue)) return '';
    // Use maximumFractionDigits: 0 and round for whole dollars, if that's the desired input style
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(numValue));
};

const parseCurrencyInput = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const cleanValue = value.replace(/[^0-9.-]/g, ''); // Remove currency symbols, commas, etc.
    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? '' : String(Math.round(numValue)); // Return as string for input value, rounded
};

const ValueInput = ({ label, calculatedValue, manualValue, onManualChange, placeholder, disabled = false }) => {
    const [displayValue, setDisplayValue] = useState('');
    
    useEffect(() => {
        setDisplayValue(formatCurrencyInput(manualValue));
    }, [manualValue]);

    const handleInputChange = (e) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue); // Keep input as-is for user typing
        const parsedValue = parseCurrencyInput(inputValue);
        onManualChange(parsedValue); // Pass parsed value to parent
    };

    const handleInputBlur = () => {
        // Re-format on blur to ensure consistent formatting
        const formatted = formatCurrencyInput(manualValue);
        setDisplayValue(formatted);
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex items-center gap-2">
                <p className="flex-1 p-2 border rounded-md bg-slate-50 text-sm">{formatCurrency(calculatedValue)}</p>
                <Input
                    type="text" // Changed to text to allow custom formatting
                    placeholder={placeholder || "$0"}
                    value={displayValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-40"
                    disabled={disabled}
                />
            </div>
        </div>
    );
};

export default function ClientValueAndFees({ client, allClients }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [period, setPeriod] = useState('ytd');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [advisorProfile, setAdvisorProfile] = useState(null);
    const [meetings, setMeetings] = useState([]);
    const [portfolios, setPortfolios] = useState([]);
    const [funds, setFunds] = useState([]);

    const [manualValues, setManualValues] = useState({
        aumFeeRate: 1,
        aumFeeDollar: '',
        timeBasedFeeDollar: '',
        merFeeDollar: '',
        taxSavings: '',
        interestSavings: '',
        feeReduction: ''
    });

    const [valueAddedItems, setValueAddedItems] = useState([
        { id: generateUUID(), description: 'Behavioral coaching (prevented panic selling)', value: 15000 },
        { id: generateUUID(), description: 'Peace of mind & time saved', value: 5000 },
    ]);
    const [editingValueItem, setEditingValueItem] = useState({ id: null, description: '', value: '' });
    
    // New state for optional fees and other fees
    const [includedFees, setIncludedFees] = useState({ aum: true, timeBased: true, mer: true });
    const [otherFeesItems, setOtherFeesItems] = useState([]);
    const [editingFeeItem, setEditingFeeItem] = useState({ id: null, description: '', value: '' });


    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const householdIds = [client.id, ...(allClients.filter(c => c.primary_client_id === client.id).map(c => c.id))];

                const [profileData, meetingData, portfolioData, fundData] = await Promise.all([
                    AdvisorProfile.list().then(res => res[0]),
                    Meeting.filter({ client_id: { "$in": householdIds } }),
                    Portfolio.filter({ client_ids: { "$in": householdIds } }),
                    Fund.list()
                ]);

                setAdvisorProfile(profileData || {});
                setMeetings(meetingData || []);
                setPortfolios(portfolioData || []);
                setFunds(fundData || []);
            } catch (error) {
                console.error("Error loading value and fees data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [client.id, allClients]);
    
    const filteredMeetings = useMemo(() => {
        const now = new Date();
        const startOfYearYTD = new Date(now.getFullYear(), 0, 1);
        
        const last12MonthsDate = new Date(now); // Create a new Date object based on 'now'
        last12MonthsDate.setMonth(now.getMonth() - 12);

        return meetings.filter(meeting => {
            const meetingDate = new Date(meeting.meeting_date);
            if (period === 'ytd') return meetingDate >= startOfYearYTD;
            if (period === 'last12months') return meetingDate >= last12MonthsDate;
            if (period === 'calendar_year') {
                const startSelectedYear = new Date(selectedYear, 0, 1);
                const endSelectedYear = new Date(selectedYear, 11, 31, 23, 59, 59);
                return meetingDate >= startSelectedYear && meetingDate <= endSelectedYear;
            }
            // 'all_time'
            return true;
        });
    }, [meetings, period, selectedYear]);

    // Calculations
    const totalPortfolioValue = useMemo(() => portfolios.reduce((sum, p) => sum + p.total_value, 0), [portfolios]);
    
    const calculatedAumFee = (totalPortfolioValue * (parseFloat(manualValues.aumFeeRate) / 100 || 0));
    const finalAumFee = manualValues.aumFeeDollar !== '' && !isNaN(parseFloat(manualValues.aumFeeDollar)) ? parseFloat(manualValues.aumFeeDollar) : calculatedAumFee;
    
    const calculatedTimeBasedFee = useMemo(() => {
        if (!advisorProfile?.hourly_rate_for_billing) return 0;
        const totalMinutes = filteredMeetings.reduce((sum, m) => sum + (m.duration || 0), 0);
        return (totalMinutes / 60) * advisorProfile.hourly_rate_for_billing;
    }, [filteredMeetings, advisorProfile]);
    const finalTimeBasedFee = manualValues.timeBasedFeeDollar !== '' && !isNaN(parseFloat(manualValues.timeBasedFeeDollar)) ? parseFloat(manualValues.timeBasedFeeDollar) : calculatedTimeBasedFee;
    
    const calculatedMerFee = useMemo(() => {
        return portfolios.reduce((totalFee, portfolio) => {
            const portfolioMer = portfolio.fund_holdings.reduce((weightedMer, holding) => {
                const fund = funds.find(f => f.id === holding.fund_id);
                const mer = fund?.mer || 0; // MER is stored as decimal e.g., 0.005 for 0.5%
                return weightedMer + (mer * (holding.allocation_percentage / 100));
            }, 0);
            return totalFee + (portfolio.total_value * portfolioMer);
        }, 0);
    }, [portfolios, funds]);
    const finalMerFee = manualValues.merFeeDollar !== '' && !isNaN(parseFloat(manualValues.merFeeDollar)) ? parseFloat(manualValues.merFeeDollar) : calculatedMerFee;

    const totalOtherFees = otherFeesItems.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);

    const totalFees =
        (includedFees.aum ? finalAumFee : 0) +
        (includedFees.timeBased ? finalTimeBasedFee : 0) +
        (includedFees.mer ? finalMerFee : 0) +
        totalOtherFees;

    const finalTaxSavings = manualValues.taxSavings !== '' ? parseFloat(manualValues.taxSavings) : 0;
    const finalInterestSavings = manualValues.interestSavings !== '' ? parseFloat(manualValues.interestSavings) : 0;
    const finalFeeReduction = manualValues.feeReduction !== '' ? parseFloat(manualValues.feeReduction) : 0;
    const totalOtherValue = valueAddedItems.reduce((sum, item) => sum + parseFloat(item.value || 0), 0);
    const totalValueAdded = finalTaxSavings + finalInterestSavings + finalFeeReduction + totalOtherValue;

    const netValue = totalValueAdded - totalFees;
    
    const handleManualValueChange = (key, value) => {
        setManualValues(prev => ({ ...prev, [key]: value }));
    };

    const handleIncludedFeeChange = (key, checked) => {
        setIncludedFees(prev => ({ ...prev, [key]: checked }));
    };

    const handleAddValueItem = () => {
        if (editingValueItem.description.trim() && editingValueItem.value !== '') {
            const numValue = parseFloat(editingValueItem.value);
            if (!isNaN(numValue)) {
                if (editingValueItem.id && editingValueItem.id !== null) {
                    // Edit existing
                    setValueAddedItems(prev => prev.map(item =>
                        item.id === editingValueItem.id
                            ? { ...item, description: editingValueItem.description.trim(), value: Math.round(numValue) }
                            : item
                    ));
                } else {
                    // Add new
                    setValueAddedItems(prev => [...prev, {
                        id: generateUUID(),
                        description: editingValueItem.description.trim(),
                        value: Math.round(numValue)
                    }]);
                }
                setEditingValueItem({ id: null, description: '', value: '' });
            }
        }
    };
    
    const handleEditValueItem = (item) => {
        setEditingValueItem({ id: item.id, description: item.description, value: String(item.value) });
    };

    const handleDeleteValueItem = (id) => {
        setValueAddedItems(prev => prev.filter(item => item.id !== id));
    };

    // --- Other Fees Handlers ---
    const handleAddOtherFee = () => {
        if (editingFeeItem.description.trim() && editingFeeItem.value !== '') {
            const numValue = parseFloat(editingFeeItem.value);
            if (!isNaN(numValue)) {
                if (editingFeeItem.id) { // Edit existing
                    setOtherFeesItems(prev => prev.map(item =>
                        item.id === editingFeeItem.id
                            ? { ...item, description: editingFeeItem.description.trim(), value: Math.round(numValue) }
                            : item
                    ));
                } else { // Add new
                    setOtherFeesItems(prev => [...prev, {
                        id: generateUUID(),
                        description: editingFeeItem.description.trim(),
                        value: Math.round(numValue)
                    }]);
                }
                setEditingFeeItem({ id: null, description: '', value: '' });
            }
        }
    };

    const handleEditOtherFee = (item) => {
        setEditingFeeItem({ id: item.id, description: item.description, value: String(item.value) });
    };

    const handleDeleteOtherFee = (id) => {
        setOtherFeesItems(prev => prev.filter(item => item.id !== id));
    };


    const handleExportPdf = async () => {
        setIsExporting(true);
        try {
            const payload = {
                clientId: client.id,
                period,
                selectedYear,
                manualValues,
                valueAddedItems,
                includedFees, // Pass included fees state
                otherFeesItems, // Pass other fees
            };
            const response = await generateValueAndFeesPdf(payload);
            
            // Check if the response is valid
            if (response && response.data && response.status === 200) {
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Value_and_Fees_Report_${client.first_name || 'Client'}_${client.last_name || 'Name'}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                 console.error("PDF generation failed:", response);
                 alert("Could not generate PDF. Please try again.");
            }

        } catch (error) {
            console.error("Error exporting PDF:", error);
            alert("An error occurred while exporting the PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return <Skeleton className="h-[600px] w-full" />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Value & Fees Report</h2>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportPdf} variant="outline" disabled={isExporting}>
                        {isExporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Export PDF
                            </>
                        )}
                    </Button>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ytd">Year-to-Date</SelectItem>
                            <SelectItem value="last12months">Last 12 Months</SelectItem>
                            <SelectItem value="calendar_year">Calendar Year</SelectItem>
                            <SelectItem value="all_time">All Time</SelectItem>
                        </SelectContent>
                    </Select>
                    {period === 'calendar_year' && (
                        <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(5)].map((_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Receipt className="text-red-600" /> Fees Paid</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 p-4 border rounded-lg">
                            <h4 className="font-semibold">Advisor Fees</h4>
                             <div className="space-y-2">
                                <Label>AUM Fee Rate (%)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={manualValues.aumFeeRate}
                                        onChange={(e) => handleManualValueChange('aumFeeRate', e.target.value)}
                                        className="w-24"
                                    />
                                    <p className="flex-1 p-2 border rounded-md bg-slate-50 text-sm">
                                        Calculated Fee: {formatCurrency(calculatedAumFee)}
                                    </p>
                                </div>
                            </div>
                             <div className="flex items-start gap-3">
                                <Checkbox
                                    id="include-aum-fee"
                                    className="mt-1"
                                    checked={includedFees.aum}
                                    onCheckedChange={(checked) => handleIncludedFeeChange('aum', checked)}
                                />
                                <div className="flex-1">
                                    <ValueInput
                                        label="AUM Fee ($)"
                                        calculatedValue={calculatedAumFee}
                                        manualValue={manualValues.aumFeeDollar}
                                        onManualChange={(val) => handleManualValueChange('aumFeeDollar', val)}
                                        placeholder="$0"
                                        disabled={!includedFees.aum}
                                    />
                                </div>
                            </div>
                             <div className="flex items-start gap-3">
                                <Checkbox
                                    id="include-timebased-fee"
                                    className="mt-1"
                                    checked={includedFees.timeBased}
                                    onCheckedChange={(checked) => handleIncludedFeeChange('timeBased', checked)}
                                />
                                <div className="flex-1">
                                    <ValueInput
                                        label="Time-Based Service Fees ($)"
                                        calculatedValue={calculatedTimeBasedFee}
                                        manualValue={manualValues.timeBasedFeeDollar}
                                        onManualChange={(val) => handleManualValueChange('timeBasedFeeDollar', val)}
                                        placeholder="$0"
                                        disabled={!includedFees.timeBased}
                                    />
                                </div>
                            </div>
                        </div>

                         <div className="flex items-start gap-3">
                            <Checkbox
                                id="include-mer-fee"
                                className="mt-1"
                                checked={includedFees.mer}
                                onCheckedChange={(checked) => handleIncludedFeeChange('mer', checked)}
                            />
                            <div className="flex-1">
                                <ValueInput
                                    label="Investment Management Fees (MERs)"
                                    calculatedValue={calculatedMerFee}
                                    manualValue={manualValues.merFeeDollar}
                                    onManualChange={(val) => handleManualValueChange('merFeeDollar', val)}
                                    placeholder="$0"
                                    disabled={!includedFees.mer}
                                />
                            </div>
                        </div>
                        
                        {/* Other Fees Paid Section */}
                        <div className="space-y-2 pt-4">
                             <h4 className="font-semibold">Other Fees Paid</h4>
                             {otherFeesItems.length > 0 && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead className="w-20">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {otherFeesItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell>{formatCurrency(item.value)}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditOtherFee(item)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteOtherFee(item.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {/* Add/Edit Other Fee Form */}
                            <div className="flex gap-2 pt-2">
                                <Input
                                    placeholder="Fee Description"
                                    value={editingFeeItem.description}
                                    onChange={(e) => setEditingFeeItem(prev => ({ ...prev, description: e.target.value }))}
                                    className="flex-1"
                                />
                                <Input
                                    type="text"
                                    placeholder="$0"
                                    value={formatCurrencyInput(editingFeeItem.value)}
                                    onChange={(e) => {
                                        const parsedValue = parseCurrencyInput(e.target.value);
                                        setEditingFeeItem(prev => ({ ...prev, value: parsedValue }));
                                    }}
                                    onBlur={(e) => {
                                        const formatted = formatCurrencyInput(editingFeeItem.value);
                                        e.target.value = formatted;
                                    }}
                                    className="w-32"
                                />
                                <Button onClick={handleAddOtherFee} size="sm">
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="bg-slate-50 p-4 font-bold text-lg flex justify-between">
                        <span>Total Fees:</span>
                        <span className="text-red-600">{formatCurrency(totalFees)}</span>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Gem className="text-green-600" /> Value Provided</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Tax Savings</Label>
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 p-2 border rounded-md bg-slate-50 text-sm">$0.00</p>
                                    <Input
                                        type="text"
                                        placeholder="$0"
                                        value={formatCurrencyInput(manualValues.taxSavings)}
                                        onChange={(e) => {
                                            const parsedValue = parseCurrencyInput(e.target.value);
                                            handleManualValueChange('taxSavings', parsedValue);
                                        }}
                                        className="w-24"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Interest Savings</Label>
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 p-2 border rounded-md bg-slate-50 text-sm">$0.00</p>
                                    <Input
                                        type="text"
                                        placeholder="$0"
                                        value={formatCurrencyInput(manualValues.interestSavings)}
                                        onChange={(e) => {
                                            const parsedValue = parseCurrencyInput(e.target.value);
                                            handleManualValueChange('interestSavings', parsedValue);
                                        }}
                                        className="w-24"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Fee Reduction</Label>
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 p-2 border rounded-md bg-slate-50 text-sm">$0.00</p>
                                    <Input
                                        type="text"
                                        placeholder="$0"
                                        value={formatCurrencyInput(manualValues.feeReduction)}
                                        onChange={(e) => {
                                            const parsedValue = parseCurrencyInput(e.target.value);
                                            handleManualValueChange('feeReduction', parsedValue);
                                        }}
                                        className="w-24"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4">
                             <h4 className="font-semibold">Other Value Added</h4>
                             {valueAddedItems.length > 0 && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead className="w-20">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {valueAddedItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell>{formatCurrency(item.value)}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditValueItem(item)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteValueItem(item.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}

                            {/* Add/Edit Value Item Form */}
                            <div className="flex gap-2 pt-2">
                                <Input
                                    placeholder="Description"
                                    value={editingValueItem.description}
                                    onChange={(e) => setEditingValueItem(prev => ({ ...prev, description: e.target.value }))}
                                    className="flex-1"
                                />
                                <Input
                                    type="text"
                                    placeholder="$0"
                                    value={formatCurrencyInput(editingValueItem.value)}
                                    onChange={(e) => {
                                        const parsedValue = parseCurrencyInput(e.target.value);
                                        setEditingValueItem(prev => ({ ...prev, value: parsedValue }));
                                    }}
                                    className="w-32"
                                />
                                <Button onClick={handleAddValueItem} size="sm">
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 p-4 font-bold text-lg flex justify-between">
                        <span>Total Value Added:</span>
                        <span className="text-green-600">{formatCurrency(totalValueAdded)}</span>
                    </CardFooter>
                </Card>
            </div>
            
            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LineChart className="text-blue-600" /> Net Value Summary</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-6">
                    <p className="text-slate-600">Total Value Provided - Total Fees Paid</p>
                    <p className={`text-4xl font-bold mt-2 ${netValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netValue)}</p>
                </CardContent>
            </Card>
        </div>
    );
}
