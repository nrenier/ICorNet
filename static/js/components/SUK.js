const { useState, useEffect } = React;

const SUK = ({ user, showToast }) => {
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [reportHistory, setReportHistory] = useState([]);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Filter companies based on search term
        if (searchTerm.trim() === '') {
            setFilteredCompanies(companies.slice(0, 20)); // Show first 20 companies
        } else {
            const filtered = companies.filter(company =>
                company.nome_azienda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.settore?.toLowerCase().includes(searchTerm.toLowerCase())
            ).slice(0, 20);
            setFilteredCompanies(filtered);
        }
    }, [searchTerm, companies]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Load companies from Neo4j
            const companiesResponse = await apiService.getCompaniesForReports();
            setCompanies(companiesResponse.companies || []);
            
            // Load user's report history
            const historyResponse = await apiService.getReportHistory();
            setReportHistory(historyResponse.reports || []);
            
        } catch (error) {
            console.error('Error loading SUK data:', error);
            showToast('Failed to load company data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCompanySelect = (company) => {
        setSelectedCompany(company);
        setSearchTerm(company.nome_azienda);
        setIsDropdownOpen(false);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);
        
        // Clear selected company if search is cleared
        if (e.target.value.trim() === '') {
            setSelectedCompany(null);
        }
    };

    const generateReport = async () => {
        if (!selectedCompany) {
            showToast('Please select a company first', 'error');
            return;
        }

        try {
            setGeneratingReport(true);
            
            const response = await apiService.generateReport(selectedCompany.nome_azienda);
            showToast('Report generation started! Check the history section for updates.', 'success');
            
            // Reload report history to show the new report
            setTimeout(() => {
                loadReportHistory();
            }, 1000);
            
        } catch (error) {
            console.error('Error generating report:', error);
            showToast('Failed to generate report', 'error');
        } finally {
            setGeneratingReport(false);
        }
    };

    const loadReportHistory = async () => {
        try {
            const historyResponse = await apiService.getReportHistory();
            setReportHistory(historyResponse.reports || []);
        } catch (error) {
            console.error('Error loading report history:', error);
        }
    };

    const downloadReport = async (reportId) => {
        try {
            const response = await apiService.downloadReport(reportId);
            showToast('Download initiated', 'success');
        } catch (error) {
            console.error('Error downloading report:', error);
            showToast('Failed to download report', 'error');
        }
    };

    const refreshReportStatus = async (reportId) => {
        try {
            const response = await apiService.getReportStatus(reportId);
            
            // Update the report in history
            setReportHistory(prev => 
                prev.map(report => 
                    report.id === reportId 
                        ? { ...report, status: response.status, file_name: response.file_name }
                        : report
                )
            );
            
        } catch (error) {
            console.error('Error refreshing report status:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading SUK data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900">SUK Analysis</h1>
                <p className="text-gray-600 mt-1">
                    Select a company and generate detailed analysis reports
                </p>
            </div>

            {/* Company Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Selection</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Search and Select */}
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search and Select Company
                        </label>
                        
                        <div className="relative">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Type to search companies..."
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <i data-feather="search" className="w-5 h-5 text-gray-400"></i>
                                </div>
                            </div>
                            
                            {/* Dropdown */}
                            {isDropdownOpen && filteredCompanies.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {filteredCompanies.map((company, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleCompanySelect(company)}
                                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="font-medium text-gray-900">
                                                {company.nome_azienda}
                                            </div>
                                            {company.settore && (
                                                <div className="text-sm text-gray-500">
                                                    Sector: {company.settore}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {searchTerm && !selectedCompany && filteredCompanies.length === 0 && (
                            <p className="mt-2 text-sm text-gray-500">
                                No companies found matching your search.
                            </p>
                        )}
                    </div>
                    
                    {/* Generate Report Button */}
                    <div className="flex items-end">
                        <button
                            onClick={generateReport}
                            disabled={!selectedCompany || generatingReport}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generatingReport ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Generating...
                                </div>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <i data-feather="file-text" className="w-4 h-4 mr-2"></i>
                                    Generate Report
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Selected Company Preview */}
                {selectedCompany && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-900 mb-2">Selected Company</h3>
                        <div className="text-sm text-blue-800">
                            <p><strong>Name:</strong> {selectedCompany.nome_azienda}</p>
                            {selectedCompany.settore && (
                                <p><strong>Sector:</strong> {selectedCompany.settore}</p>
                            )}
                            {selectedCompany.descrizione && (
                                <p><strong>Description:</strong> {selectedCompany.descrizione}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Report History */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Report History</h2>
                    <button
                        onClick={loadReportHistory}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        <i data-feather="refresh-cw" className="w-4 h-4 inline mr-1"></i>
                        Refresh
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Company
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportHistory.length > 0 ? (
                                reportHistory.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {report.company_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    report.status === 'completed' 
                                                        ? 'bg-green-100 text-green-800'
                                                        : report.status === 'failed'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {report.status}
                                                </span>
                                                {report.status === 'pending' && (
                                                    <button
                                                        onClick={() => refreshReportStatus(report.id)}
                                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                                        title="Refresh status"
                                                    >
                                                        <i data-feather="refresh-cw" className="w-3 h-3"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.created_at 
                                                ? new Date(report.created_at).toLocaleString()
                                                : 'N/A'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {report.status === 'completed' ? (
                                                <button
                                                    onClick={() => downloadReport(report.id)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    <i data-feather="download" className="w-4 h-4 inline mr-1"></i>
                                                    Download
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <i data-feather="file-text" className="w-8 h-8 text-gray-300 mb-2"></i>
                                            <p>No reports generated yet</p>
                                            <p className="text-xs mt-1">Select a company and generate your first report</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Make SUK component globally available
window.SUK = SUK;
