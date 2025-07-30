
const { useState, useEffect } = React;

// Utility functions for mapping class codes to readable values
const mapClasseAddetti = (code) => {
    const mapping = {
        'A': '0-4 addetti',
        'B': '5-9 addetti',
        'C': '10-19 addetti',
        'D': '20-49 addetti',
        'E': '50-249 addetti',
        'F': 'Almeno 250 addetti'
    };
    return mapping[code] || code || 'Non disponibile';
};

const mapClasseCapitaleSociale = (code) => {
    const mapping = {
        '1': '1€',
        '2': '1€ - 5 K€',
        '3': '5 K€ - 10 K€',
        '4': '10 K€ - 50 K€',
        '5': '50 K€ - 100 K€',
        '6': '100 K€ - 250 K€',
        '7': '250 K€ - 500 K€',
        '8': '500 K€ - 1 M€',
        '9': '1 M€ - 2,5 M€',
        '10': '2,5 M€ - 5 M€',
        '11': 'Più di 5 M€'
    };
    return mapping[code] || code || 'Non disponibile';
};

const mapClasseValoreProduzione = (code) => {
    const mapping = {
        'A': '0€ - 100 K€',
        'B': '100 K€ - 500 K€',
        'C': '500 K€ - 1 M€',
        'D': '1 M€ - 2 M€',
        'E': '2 M€ - 5 M€',
        'F': '5 M€ - 10 M€',
        'G': '10 M€ - 50 M€',
        'H': 'Più di 50 M€'
    };
    return mapping[code] || code || 'Non disponibile';
};

const CompanyRelationshipsGraph = ({ companyName, onRelationshipClick }) => {
    const [relationships, setRelationships] = useState({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (companyName) {
            loadRelationships();
        }
    }, [companyName]);

    const loadRelationships = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.getStartupCompanyRelationships(companyName);
            setRelationships(response.relationships || { nodes: [], edges: [] });
        } catch (err) {
            console.error('Error loading relationships:', err);
            setError('Errore nel caricamento delle relazioni');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (relationships.nodes.length > 0 && !loading) {
            renderGraph();
        }
    }, [relationships, loading]);

    const renderGraph = () => {
        const container = document.getElementById(`graph-${companyName.replace(/\s+/g, '-')}`);
        if (!container || typeof d3 === 'undefined') return;

        // Clear previous graph
        d3.select(container).selectAll("*").remove();

        const width = container.offsetWidth || 600;
        const height = 400;

        const svg = d3.select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const simulation = d3.forceSimulation(relationships.nodes)
            .force("link", d3.forceLink(relationships.edges).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        // Links
        const link = svg.append("g")
            .selectAll("line")
            .data(relationships.edges)
            .enter().append("line")
            .attr("stroke-width", d => Math.sqrt(d.weight || 1) * 2)
            .attr("stroke", "#999")
            .attr("opacity", 0.6);

        // Nodes
        const node = svg.append("g")
            .selectAll("circle")
            .data(relationships.nodes)
            .enter().append("circle")
            .attr("r", d => d.type === 'center' ? 12 : 8)
            .attr("fill", d => d.type === 'center' ? "#2563eb" : "#94a3b8")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Labels
        const label = svg.append("g")
            .selectAll("text")
            .data(relationships.nodes)
            .enter().append("text")
            .text(d => d.name)
            .attr("font-size", "10px")
            .attr("text-anchor", "middle")
            .attr("dy", -15);

        // Add click handler for edges
        link.on("click", (event, d) => {
            if (onRelationshipClick) {
                const relationship = {
                    source: { properties: { nome_azienda: d.source.name || d.source } },
                    target: { properties: { nome_azienda: d.target.name || d.target } },
                    relationship: { properties: d.properties || {} }
                };
                onRelationshipClick(relationship);
            }
        }).style("cursor", "pointer");

        simulation
            .nodes(relationships.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(relationships.edges);

        function ticked() {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            label
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        }

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    };

    if (!companyName) return null;

    return (
        <div className="bg-teal-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-teal-900">Company Relationships Graph</h3>
                <button
                    onClick={loadRelationships}
                    disabled={loading}
                    className="text-teal-600 hover:text-teal-800 text-sm font-medium disabled:opacity-50"
                >
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Refresh
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                        <p className="text-teal-600 text-sm">Loading relationships...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {!loading && !error && relationships.nodes.length === 0 && (
                <div className="text-center py-8 text-teal-600">
                    <i data-feather="link" className="w-12 h-12 mx-auto mb-2 text-teal-300"></i>
                    <p>No relationships found for this company</p>
                </div>
            )}

            {!loading && !error && relationships.nodes.length > 0 && (
                <div>
                    <div 
                        id={`graph-${companyName.replace(/\s+/g, '-')}`}
                        className="w-full h-96 bg-white rounded border"
                    ></div>
                    <div className="mt-4 text-sm text-teal-700">
                        <p><strong>Legend:</strong></p>
                        <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                                <span>Selected company</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                                <span>Related companies</span>
                            </div>
                        </div>
                        <p className="text-xs mt-2 text-teal-600">
                            Click on connection lines to see relationship details
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const STARTUP = ({ user, showToast }) => {
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [reportHistory, setReportHistory] = useState([]);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showRelationshipModal, setShowRelationshipModal] = useState(false);
    const [selectedRelationship, setSelectedRelationship] = useState(null);
    const [selectedReports, setSelectedReports] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingReports, setDeletingReports] = useState(false);
    const mountedRef = React.useRef(true);

    useEffect(() => {
        loadData();

        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        // Filter companies based on search term
        if (searchTerm.trim() === '') {
            setFilteredCompanies(companies.slice(0, 20));
        } else {
            const filtered = companies.filter(company => {
                const nameMatch = company.nome_azienda?.toLowerCase().includes(searchTerm.toLowerCase());

                let activityMatch = false;
                if (company.tipologia_attivita) {
                    if (Array.isArray(company.tipologia_attivita)) {
                        activityMatch = company.tipologia_attivita.some(a => 
                            typeof a === 'string' && a.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                    } else if (typeof company.tipologia_attivita === 'string') {
                        activityMatch = company.tipologia_attivita.toLowerCase().includes(searchTerm.toLowerCase());
                    }
                }

                return nameMatch || activityMatch;
            }).slice(0, 20);
            setFilteredCompanies(filtered);
        }
    }, [searchTerm, companies]);

    const safeSetState = (setter, value) => {
        if (mountedRef.current) {
            setter(value);
        }
    };

    const loadData = async () => {
        try {
            safeSetState(setLoading, true);

            const companiesResponse = await apiService.getStartupCompaniesForReports();
            safeSetState(setCompanies, companiesResponse.companies || []);

            const historyResponse = await apiService.getReportHistory('startup');
            safeSetState(setReportHistory, historyResponse.reports || []);

        } catch (error) {
            console.error('Error loading STARTUP data:', error);
            if (mountedRef.current) {
                showToast('Failed to load company data', 'error');
            }
        } finally {
            safeSetState(setLoading, false);
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

            const response = await apiService.generateReport(selectedCompany.nome_azienda, 'startup');
            showToast('Report generation started! Check the history section for updates.', 'success');

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
            const historyResponse = await apiService.getReportHistory('startup');
            setReportHistory(historyResponse.reports || []);
        } catch (error) {
            console.error('Error loading report history:', error);
        }
    };

    const downloadReport = async (reportId) => {
        try {
            await apiService.downloadReport(reportId);
            showToast('Download completed', 'success');
        } catch (error) {
            console.error('Error downloading report:', error);
            showToast('Failed to download report', 'error');
        }
    };

    const viewReport = async (reportId) => {
        try {
            await apiService.viewReport(reportId);
            showToast('Opening report in new tab', 'success');
        } catch (error) {
            console.error('Error viewing report:', error);
            showToast('Failed to view report', 'error');
        }
    };

    const refreshReportStatus = async (reportId) => {
        try {
            const response = await apiService.getReportStatus(reportId);

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

    const openRelationshipModal = (relationship) => {
        setSelectedRelationship({
            source: relationship.source.properties.nome_azienda,
            target: relationship.target.properties.nome_azienda,
            properties: relationship.relationship.properties,
        });
        setShowRelationshipModal(true);
    };

    const closeRelationshipModal = () => {
        setShowRelationshipModal(false);
        setSelectedRelationship(null);
    };

    const toggleReportSelection = (reportId) => {
        setSelectedReports(prev => 
            prev.includes(reportId)
                ? prev.filter(id => id !== reportId)
                : [...prev, reportId]
        );
    };

    const toggleSelectAllReports = () => {
        if (selectedReports.length === reportHistory.length) {
            setSelectedReports([]);
        } else {
            setSelectedReports(reportHistory.map(report => report.id));
        }
    };

    const openDeleteModal = () => {
        if (selectedReports.length === 0) {
            showToast('Please select reports to delete', 'error');
            return;
        }
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    const confirmBulkDelete = async () => {
        try {
            setDeletingReports(true);
            const reportsToDelete = [...selectedReports];

            await apiService.bulkDeleteReports(reportsToDelete);

            setSelectedReports([]);
            setShowDeleteModal(false);

            setReportHistory(prev => 
                prev.filter(report => !reportsToDelete.includes(report.id))
            );

            showToast(`Successfully deleted ${reportsToDelete.length} report(s)`, 'success');

        } catch (error) {
            console.error('Error deleting reports:', error);
            showToast('Failed to delete reports', 'error');
            setShowDeleteModal(false);
        } finally {
            setDeletingReports(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading STARTUP data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">STARTUP Analysis</h1>
                </div>
                <p className="text-gray-600 mt-1">
                    Select a startup company and generate detailed analysis reports
                </p>
            </div>

            {/* Company Selection */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Selection</h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                    placeholder="Digita per cercare aziende..."
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <i data-feather="search" className="w-5 h-5 text-gray-400"></i>
                                </div>
                            </div>

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
                                            {company.tipologia_attivita && (
                                                <div className="text-sm text-gray-500">
                                                    Attività: {Array.isArray(company.tipologia_attivita) ? company.tipologia_attivita.join(', ') : company.tipologia_attivita}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {searchTerm && !selectedCompany && filteredCompanies.length === 0 && (
                            <p className="mt-2 text-sm text-gray-500">
                                Nessuna azienda trovata corrispondente alla ricerca.
                            </p>
                        )}
                    </div>

                    <div className="flex items-end space-x-3">
                        <button
                            onClick={generateReport}
                            disabled={!selectedCompany || generatingReport}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generatingReport ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Generating...
                                </div>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                                    </svg>
                                    Generate Report
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Detailed Company Information */}
                {selectedCompany && (
                    <div className="mt-6 space-y-6">
                        {/* General Information */}
                        <div className="bg-blue-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Informazioni Generali</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                                {selectedCompany.nome_azienda && (
                                    <div>
                                        <strong>Nome Azienda:</strong> {selectedCompany.nome_azienda}
                                    </div>
                                )}
                                {selectedCompany.ragione_sociale && (
                                    <div>
                                        <strong>Ragione Sociale:</strong> {selectedCompany.ragione_sociale}
                                    </div>
                                )}
                                {selectedCompany.partita_iva && (
                                    <div>
                                        <strong>Partita IVA:</strong> {selectedCompany.partita_iva}
                                    </div>
                                )}
                                {selectedCompany.codice_fiscale && (
                                    <div>
                                        <strong>Codice Fiscale:</strong> {selectedCompany.codice_fiscale}
                                    </div>
                                )}
                                {selectedCompany.natura_giuridica && (
                                    <div>
                                        <strong>Natura Giuridica:</strong> {selectedCompany.natura_giuridica}
                                    </div>
                                )}
                                {selectedCompany.data_inizio_attivita && (
                                    <div>
                                        <strong>Data Inizio Attività:</strong> {selectedCompany.data_inizio_attivita}
                                    </div>
                                )}
                                {selectedCompany.data_iscrizione_startup && (
                                    <div>
                                        <strong>Data Iscrizione Startup:</strong> {selectedCompany.data_iscrizione_startup}
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
                            </div>
                            {selectedCompany.descrizione && (
                                <div className="mt-4">
                                    <strong>Descrizione:</strong>
                                    <p className="mt-1 text-blue-700">{selectedCompany.descrizione}</p>
                                </div>
                            )}
                        </div>

                        {/* Business Information */}
                        <div className="bg-green-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-900 mb-4">Informazioni Commerciali</h3>
                            <div className="space-y-4 text-sm text-green-800">
                                {selectedCompany.settore && (
                                    <div>
                                        <strong>Settore:</strong> {selectedCompany.settore}
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
                                {selectedCompany.codice_ateco && (
                                    <div>
                                        <strong>Codice ATECO:</strong> {selectedCompany.codice_ateco}
                                    </div>
                                )}
                                {selectedCompany.descrizione_ateco && (
                                    <div>
                                        <strong>Descrizione ATECO:</strong> {selectedCompany.descrizione_ateco}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Location Information */}
                        <div className="bg-purple-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-purple-900 mb-4">Informazioni Geografiche</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
                                {selectedCompany.regione && (
                                    <div>
                                        <strong>Regione:</strong> {selectedCompany.regione}
                                    </div>
                                )}
                                {selectedCompany.sigla_provincia && (
                                    <div>
                                        <strong>Provincia:</strong> {selectedCompany.sigla_provincia}
                                    </div>
                                )}
                                {selectedCompany.comune && (
                                    <div>
                                        <strong>Comune:</strong> {selectedCompany.comune}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Products and Solutions */}
                        {selectedCompany.classificazione_prodotti && selectedCompany.classificazione_prodotti.length > 0 && (
                            <div className="bg-orange-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-orange-900 mb-4">Prodotti e Soluzioni</h3>
                                <div className="text-sm text-orange-800">
                                    <strong>Classificazione Prodotti:</strong>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        {selectedCompany.classificazione_prodotti.map((prodotto, index) => (
                                            <li key={index}>{prodotto}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Business Network */}
                        <div className="bg-indigo-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-indigo-900 mb-4">Rete Commerciale</h3>
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
                            </div>
                        </div>

                        {/* Company Characteristics */}
                        <div className="bg-yellow-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-yellow-900 mb-4">Caratteristiche Aziendali</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
                                {selectedCompany.prevalenza_giovanile && (
                                    <div>
                                        <strong>Prevalenza Giovanile:</strong> {selectedCompany.prevalenza_giovanile}
                                    </div>
                                )}
                                {selectedCompany.prevalenza_femminile && (
                                    <div>
                                        <strong>Prevalenza Femminile:</strong> {selectedCompany.prevalenza_femminile}
                                    </div>
                                )}
                                {selectedCompany.prevalenza_straniera && (
                                    <div>
                                        <strong>Prevalenza Straniera:</strong> {selectedCompany.prevalenza_straniera}
                                    </div>
                                )}
                                {selectedCompany.possiede_brevetti && (
                                    <div>
                                        <strong>Possiede Brevetti:</strong> {selectedCompany.possiede_brevetti}
                                    </div>
                                )}
                                {selectedCompany.alto_valore_tecnologico && (
                                    <div>
                                        <strong>Alto Valore Tecnologico:</strong> {selectedCompany.alto_valore_tecnologico}
                                    </div>
                                )}
                                {selectedCompany.classe_addetti && (
                                    <div>
                                        <strong>Classe Addetti:</strong> {mapClasseAddetti(selectedCompany.classe_addetti)}
                                    </div>
                                )}
                                {selectedCompany.classe_capitale_sociale && (
                                    <div>
                                        <strong>Classe Capitale Sociale:</strong> {mapClasseCapitaleSociale(selectedCompany.classe_capitale_sociale)}
                                    </div>
                                )}
                                {selectedCompany.classe_valore_produzione && (
                                    <div>
                                        <strong>Classe Valore Produzione:</strong> {mapClasseValoreProduzione(selectedCompany.classe_valore_produzione)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sources */}
                        {selectedCompany.fonti && selectedCompany.fonti.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fonti</h3>
                                <div className="space-y-2 text-sm text-gray-800">
                                    {selectedCompany.fonti.map((fonte, index) => (
                                        <div key={index} className="border-l-4 border-gray-300 pl-3">
                                            {fonte.startsWith('http') ? (
                                                <a href={fonte} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                                    {fonte}
                                                </a>
                                            ) : (
                                                fonte
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Company Relationships Graph */}
                        <CompanyRelationshipsGraph 
                            companyName={selectedCompany.nome_azienda}
                            onRelationshipClick={openRelationshipModal}
                        />
                    </div>
                )}
            </div>

            {/* Report History */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">Report History</h2>
                        {selectedReports.length > 0 && (
                            <span className="text-sm text-gray-600">
                                {selectedReports.length} selected
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        {selectedReports.length > 0 && (
                            <button
                                onClick={openDeleteModal}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium flex items-center"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Delete Selected ({selectedReports.length})
                            </button>
                        )}
                        <button
                            onClick={loadReportHistory}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={reportHistory.length > 0 && selectedReports.length === reportHistory.length}
                                            onChange={toggleSelectAllReports}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2">Select</span>
                                    </div>
                                </th>
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
                                    <tr key={report.id} className={`hover:bg-gray-50 ${selectedReports.includes(report.id) ? 'bg-blue-50' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={selectedReports.includes(report.id)}
                                                onChange={() => toggleReportSelection(report.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </td>
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
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <polyline points="23 4 23 10 17 10"></polyline>
                                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                        </svg>
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
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => viewReport(report.id)}
                                                        className="text-green-600 hover:text-green-800 font-medium"
                                                        title="View PDF"
                                                    >
                                                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7 1.274 4.057-1.512 8.057-5.954 8.057-4.441 0-7.229-4-8.503-8z" />
                                                        </svg>
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => downloadReport(report.id)}
                                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                                        title="Download PDF"
                                                    >
                                                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-5l-4 4-4-4m-4-5l4 4 4-4" />
                                                        </svg>
                                                        Download
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                                            </svg>
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

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="bg-red-600 text-white p-6 rounded-t-xl">
                            <div className="flex items-center">
                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <h3 className="text-xl font-bold">Confirm Deletion</h3>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Are you sure you want to delete <strong>{selectedReports.length}</strong> report{selectedReports.length > 1 ? 's' : ''}?
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                                This action cannot be undone. The associated PDF files will be permanently deleted.
                            </p>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                                        <p className="text-sm text-yellow-700 mt-1">
                                            Selected reports and related files will be permanently deleted.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
                            <button
                                onClick={closeDeleteModal}
                                disabled={deletingReports}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBulkDelete}
                                disabled={deletingReports}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center"
                            >
                                {deletingReports ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Delete {selectedReports.length} Report{selectedReports.length > 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Relationship Details Modal */}
            {showRelationshipModal && selectedRelationship && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold">Relationship Details</h3>
                                    <p className="text-blue-100 text-sm mt-1">Analysis of business connections</p>
                                </div>
                                <button
                                    onClick={closeRelationshipModal}
                                    className="text-white hover:text-gray-200 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col items-center">
                                        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold text-center min-w-[120px]">
                                            {selectedRelationship.source}
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1">Source Company</span>
                                    </div>

                                    <div className="flex flex-col items-center mx-4">
                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                            {selectedRelationship.properties?.type || 'Relationship'}
                                        </div>
                                        <svg className="w-6 h-6 text-gray-400 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold text-center min-w-[120px]">
                                            {selectedRelationship.target}
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1">Target Company</span>
                                    </div>
                                </div>
                            </div>

                            {selectedRelationship.properties?.type && (
                                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        <h4 className="text-lg font-semibold text-green-800">Relationship Type</h4>
                                    </div>
                                    <p className="text-green-700 mt-2 font-medium capitalize">
                                        {selectedRelationship.properties.type}
                                    </p>
                                </div>
                            )}

                            {selectedRelationship.properties && Object.keys(selectedRelationship.properties).length > 0 && (
                                <div>
                                    <div className="flex items-center mb-4">
                                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <h4 className="text-lg font-semibold text-gray-900">Additional Details</h4>
                                    </div>

                                    <div className="grid gap-4">
                                        {Object.entries(selectedRelationship.properties).map(([key, value]) => {
                                            if (key === 'type') return null;

                                            return (
                                                <div key={key} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <h5 className="font-medium text-gray-900 capitalize mb-1">
                                                                {key.replace(/_/g, ' ')}
                                                            </h5>
                                                            <div className="text-gray-700 text-sm leading-relaxed">
                                                                {key === 'weight' ? (
                                                                    <div className="flex items-center">
                                                                        <div className="flex space-x-1 mr-2">
                                                                            {[...Array(5)].map((_, i) => (
                                                                                <svg 
                                                                                    key={i}
                                                                                    className={`w-4 h-4 ${i < parseInt(value) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                                                                    fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path d="M10 15l-5.878 3.09 1.123-6.545L.587 8.41l6.545-.953L10 2.102l2.868 5.355 6.545.953-4.758 4.14.545 6.545L10 15z"/>
                                                                                </svg>
                                                                            ))}
                                                                        </div>
                                                                        <span className="font-medium">{value}/5</span>
                                                                    </div>
                                                                ) : (
                                                                    <span>{String(value)}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {key === 'weight' && (
                                                            <div className="ml-4">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                    parseInt(value) >= 4 ? 'bg-green-100 text-green-800' :
                                                                    parseInt(value) >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {parseInt(value) >= 4 ? 'Strong' : parseInt(value) >= 3 ? 'Medium' : 'Weak'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
                            <button
                                onClick={closeRelationshipModal}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Make STARTUP component globally available
window.STARTUP = STARTUP;
