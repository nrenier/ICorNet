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
            const filtered = companies.filter(company => {
                const nameMatch = company.nome_azienda?.toLowerCase().includes(searchTerm.toLowerCase());
                
                let settoreMatch = false;
                if (company.settore) {
                    if (Array.isArray(company.settore)) {
                        settoreMatch = company.settore.some(s => 
                            typeof s === 'string' && s.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    } else if (typeof company.settore === 'string') {
                        settoreMatch = company.settore.toLowerCase().includes(searchTerm.toLowerCase());
                    }
                }
                
                return nameMatch || settoreMatch;
            }).slice(0, 20);
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

                {/* Detailed Company Information */}
                {selectedCompany && (
                    <div className="mt-6 space-y-6">
                        {/* Informazioni Generali */}
                        <div className="bg-blue-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Informazioni Generali</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                                {selectedCompany.nome_azienda && (
                                    <div>
                                        <strong>Nome Azienda:</strong> {selectedCompany.nome_azienda}
                                    </div>
                                )}
                                {selectedCompany.partita_iva && (
                                    <div>
                                        <strong>Partita IVA:</strong> {selectedCompany.partita_iva}
                                    </div>
                                )}
                                {selectedCompany.indirizzo && (
                                    <div>
                                        <strong>Indirizzo:</strong> {selectedCompany.indirizzo}
                                    </div>
                                )}
                                {selectedCompany.sito_web && (
                                    <div>
                                        <strong>Sito Web:</strong> 
                                        <a href={selectedCompany.sito_web} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-1">
                                            {selectedCompany.sito_web}
                                        </a>
                                    </div>
                                )}
                                {selectedCompany.data_inizio_attivita && (
                                    <div>
                                        <strong>Data Inizio Attività:</strong> {selectedCompany.data_inizio_attivita}
                                    </div>
                                )}
                                {selectedCompany.TRL && (
                                    <div>
                                        <strong>TRL:</strong> {selectedCompany.TRL}
                                    </div>
                                )}
                            </div>
                            {selectedCompany.descrizione && (
                                <div className="mt-4">
                                    <strong>Descrizione:</strong>
                                    <p className="mt-1 text-blue-700">{selectedCompany.descrizione}</p>
                                </div>
                            )}
                        </div>

                        {/* Settori e Attività */}
                        <div className="bg-green-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-900 mb-4">Settori e Attività</h3>
                            <div className="space-y-4 text-sm text-green-800">
                                {selectedCompany.settore && (
                                    <div>
                                        <strong>Settori:</strong>
                                        {Array.isArray(selectedCompany.settore) ? (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {selectedCompany.settore.map((settore, index) => (
                                                    <span key={index} className="bg-green-200 px-2 py-1 rounded text-xs">
                                                        {settore}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="ml-2">{selectedCompany.settore}</span>
                                        )}
                                    </div>
                                )}
                                {selectedCompany.tipologia_attivita && (
                                    <div>
                                        <strong>Tipologia Attività:</strong>
                                        {Array.isArray(selectedCompany.tipologia_attivita) ? (
                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                {selectedCompany.tipologia_attivita.map((attivita, index) => (
                                                    <li key={index}>{attivita}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="ml-2">{selectedCompany.tipologia_attivita}</span>
                                        )}
                                    </div>
                                )}
                                {selectedCompany.verticali && (
                                    <div>
                                        <strong>Verticali:</strong>
                                        {Array.isArray(selectedCompany.verticali) ? (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {selectedCompany.verticali.map((verticale, index) => (
                                                    <span key={index} className="bg-green-200 px-2 py-1 rounded text-xs">
                                                        {verticale}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="ml-2">{selectedCompany.verticali}</span>
                                        )}
                                    </div>
                                )}
                                {selectedCompany.tipo_mercato && (
                                    <div>
                                        <strong>Tipo Mercato:</strong>
                                        {Array.isArray(selectedCompany.tipo_mercato) ? (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {selectedCompany.tipo_mercato.map((mercato, index) => (
                                                    <span key={index} className="bg-green-200 px-2 py-1 rounded text-xs">
                                                        {mercato}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="ml-2">{selectedCompany.tipo_mercato}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Prodotti e Soluzioni */}
                        <div className="bg-purple-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-purple-900 mb-4">Prodotti e Soluzioni</h3>
                            <div className="space-y-4 text-sm text-purple-800">
                                {selectedCompany.prodotto_soluzione && (
                                    <div>
                                        <strong>Prodotto/Soluzione:</strong> {selectedCompany.prodotto_soluzione}
                                    </div>
                                )}
                                {selectedCompany.descrizione_soluzione && (
                                    <div>
                                        <strong>Descrizione Soluzione:</strong>
                                        <p className="mt-1">{selectedCompany.descrizione_soluzione}</p>
                                    </div>
                                )}
                                {selectedCompany.classificazione_prodotti && selectedCompany.classificazione_prodotti.length > 0 && (
                                    <div>
                                        <strong>Classificazione Prodotti:</strong>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {selectedCompany.classificazione_prodotti.map((prodotto, index) => (
                                                <li key={index}>{prodotto}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedCompany.use_cases && (
                                    <div>
                                        <strong>Use Cases:</strong>
                                        <p className="mt-1 text-xs leading-relaxed">{selectedCompany.use_cases}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tecnologie */}
                        {selectedCompany.tecnologie_usate && (
                            <div className="bg-orange-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-orange-900 mb-4">Tecnologie</h3>
                                <div className="text-sm text-orange-800">
                                    <strong>Tecnologie Usate:</strong>
                                    <pre className="mt-1 text-xs leading-relaxed whitespace-pre-wrap bg-white p-3 rounded border">
                                        {selectedCompany.tecnologie_usate}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Partnership e Clienti */}
                        <div className="bg-indigo-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-indigo-900 mb-4">Partnership e Clienti</h3>
                            <div className="space-y-4 text-sm text-indigo-800">
                                {selectedCompany.potenziali_clienti && selectedCompany.potenziali_clienti.length > 0 && (
                                    <div>
                                        <strong>Potenziali Clienti:</strong>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {selectedCompany.potenziali_clienti.map((cliente, index) => (
                                                <li key={index}>{cliente}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedCompany.potenziali_partner && selectedCompany.potenziali_partner.length > 0 && (
                                    <div>
                                        <strong>Potenziali Partner:</strong>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {selectedCompany.potenziali_partner.map((partner, index) => (
                                                <li key={index}>{partner}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedCompany.investitori && selectedCompany.investitori.length > 0 && (
                                    <div>
                                        <strong>Investitori:</strong>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {selectedCompany.investitori.map((investitore, index) => (
                                                <li key={index}>{investitore}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedCompany.aziende_controllate && selectedCompany.aziende_controllate.length > 0 && (
                                    <div>
                                        <strong>Aziende Controllate:</strong>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {selectedCompany.aziende_controllate.map((azienda, index) => (
                                                <li key={index}>{azienda}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Informazioni Finanziarie */}
                        <div className="bg-yellow-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-yellow-900 mb-4">Informazioni Finanziarie e Proprietà</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
                                {selectedCompany.revenues_200K && (
                                    <div>
                                        <strong>Ricavi > 200K:</strong> {selectedCompany.revenues_200K}
                                    </div>
                                )}
                                {selectedCompany.revenues_50K_50M && (
                                    <div>
                                        <strong>Ricavi 50K-50M:</strong> {selectedCompany.revenues_50K_50M}
                                    </div>
                                )}
                                {selectedCompany.brevetti && (
                                    <div>
                                        <strong>Brevetti:</strong> {selectedCompany.brevetti}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notizie */}
                        {selectedCompany.notizie_correlate && selectedCompany.notizie_correlate.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notizie Correlate</h3>
                                <div className="space-y-2 text-sm text-gray-800">
                                    {selectedCompany.notizie_correlate.map((notizia, index) => (
                                        <div key={index} className="border-l-4 border-gray-300 pl-3">
                                            {notizia}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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
