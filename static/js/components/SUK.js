const { useState, useEffect } = React;

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
            const response = await apiService.getCompanyRelationships(companyName);
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
                <h3 className="text-lg font-semibold text-teal-900">Grafo delle Relazioni</h3>
                <button
                    onClick={loadRelationships}
                    disabled={loading}
                    className="text-teal-600 hover:text-teal-800 text-sm font-medium disabled:opacity-50"
                >
                    <i data-feather="refresh-cw" className="w-4 h-4 inline mr-1"></i>
                    Aggiorna
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                        <p className="text-teal-600 text-sm">Caricamento relazioni...</p>
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
                    <p>Nessuna relazione trovata per questa azienda</p>
                </div>
            )}

            {!loading && !error && relationships.nodes.length > 0 && (
                <div>
                    <div 
                        id={`graph-${companyName.replace(/\s+/g, '-')}`}
                        className="w-full h-96 bg-white rounded border"
                    ></div>
                    <div className="mt-4 text-sm text-teal-700">
                        <p><strong>Legenda:</strong></p>
                        <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                                <span>Azienda selezionata</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                                <span>Aziende correlate</span>
                            </div>
                        </div>
                        <p className="text-xs mt-2 text-teal-600">
                            Clicca sulle linee di connessione per vedere i dettagli della relazione
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const SUK = ({ user, showToast }) => {
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

    const exportToPDF = () => {
        if (!selectedCompany) {
            showToast('Please select a company first', 'error');
            return;
        }

        try {
            // Create a new window for printing
            const printWindow = window.open('', '_blank');

            // Generate HTML content for the PDF
            const htmlContent = generatePDFContent(selectedCompany);

            printWindow.document.write(htmlContent);
            printWindow.document.close();

            // Wait for the content to load, then print
            printWindow.onload = () => {
                printWindow.print();
                printWindow.close();
            };

            showToast('PDF export initiated', 'success');

        } catch (error) {
            console.error('Error exporting PDF:', error);
            showToast('Failed to export PDF', 'error');
        }
    };

    const generatePDFContent = (company) => {
        const currentDate = new Date().toLocaleDateString('it-IT');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Scheda Azienda - ${company.nome_azienda}</title>
            <style>
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 20px auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #2563eb;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #2563eb;
                    margin: 0;
                    font-size: 28px;
                }
                .header .subtitle {
                    color: #666;
                    font-size: 14px;
                    margin-top: 5px;
                }
                .section {
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                }
                .section-title {
                    background: #f8fafc;
                    color: #1e40af;
                    padding: 10px 15px;
                    margin: 0 0 15px 0;
                    font-size: 16px;
                    font-weight: bold;
                    border-left: 4px solid #2563eb;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 15px;
                }
                .info-item {
                    padding: 8px 0;
                }
                .info-label {
                    font-weight: bold;
                    color: #374151;
                }
                .info-value {
                    color: #4b5563;
                    margin-top: 2px;
                }
                .description-box {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    padding: 15px;
                    border-radius: 5px;
                    margin-top: 10px;
                }
                .tag-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                    margin-top: 5px;
                }
                .tag {
                    background: #e0e7ff;
                    color: #3730a3;
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                }
                .list-item {
                    margin: 5px 0;
                    padding-left: 15px;
                }
                .list-item:before {
                    content: "• ";
                    color: #2563eb;
                    font-weight: bold;
                    margin-right: 5px;
                }
                @page {
                    margin: 1in;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Scheda Azienda</h1>
                <h2 style="color: #2563eb; margin: 10px 0;">${company.nome_azienda}</h2>
                <div class="subtitle">Generato il ${currentDate} | ICorNet Analysis Platform</div>
            </div>

            ${company.nome_azienda || company.partita_iva || company.indirizzo || company.sito_web || company.data_inizio_attivita || company.TRL || company.descrizione ? `
            <div class="section">
                <h3 class="section-title">Informazioni Generali</h3>
                <div class="info-grid">
                    ${company.nome_azienda ? `
                    <div class="info-item">
                        <div class="info-label">Nome Azienda</div>
                        <div class="info-value">${company.nome_azienda}</div>
                    </div>` : ''}
                    ${company.partita_iva ? `
                    <div class="info-item">
                        <div class="info-label">Partita IVA</div>
                        <div class="info-value">${company.partita_iva}</div>
                    </div>` : ''}
                    ${company.indirizzo ? `
                    <div class="info-item">
                        <div class="info-label">Indirizzo</div>
                        <div class="info-value">${company.indirizzo}</div>
                    </div>` : ''}
                    ${company.sito_web ? `
                    <div class="info-item">
                        <div class="info-label">Sito Web</div>
                        <div class="info-value">${company.sito_web}</div>
                    </div>` : ''}
                    ${company.data_inizio_attivita ? `
                    <div class="info-item">
                        <div class="info-label">Data Inizio Attività</div>
                        <div class="info-value">${company.data_inizio_attivita}</div>
                    </div>` : ''}
                    ${company.TRL ? `
                    <div class="info-item">
                        <div class="info-label">TRL</div>
                        <div class="info-value">${company.TRL}</div>
                    </div>` : ''}
                </div>
                ${company.descrizione ? `
                <div class="description-box">
                    <div class="info-label">Descrizione</div>
                    <div style="margin-top: 8px;">${company.descrizione}</div>
                </div>` : ''}
            </div>` : ''}

            ${company.settore || company.tipologia_attivita || company.verticali || company.tipo_mercato ? `
            <div class="section">
                <h3 class="section-title">Settori e Attività</h3>
                ${company.settore ? `
                <div class="info-item">
                    <div class="info-label">Settori</div>
                    <div class="tag-list">
                        ${Array.isArray(company.settore) 
                            ? company.settore.map(s => `<span class="tag">${s}</span>`).join('')
                            : `<span class="tag">${company.settore}</span>`
                        }
                    </div>
                </div>` : ''}
                ${company.tipologia_attivita ? `
                <div class="info-item">
                    <div class="info-label">Tipologia Attività</div>
                    ${Array.isArray(company.tipologia_attivita) 
                        ? company.tipologia_attivita.map(a => `<div class="list-item">${a}</div>`).join('')
                        : `<div class="info-value">${company.tipologia_attivita}</div>`
                    }
                </div>` : ''}
                ${company.verticali ? `
                <div class="info-item">
                    <div class="info-label">Verticali</div>
                    <div class="tag-list">
                        ${Array.isArray(company.verticali) 
                            ? company.verticali.map(v => `<span class="tag">${v}</span>`).join('')
                            : `<span class="tag">${company.verticali}</span>`
                        }
                    </div>
                </div>` : ''}
                ${company.tipo_mercato ? `
                <div class="info-item">
                    <div class="info-label">Tipo Mercato</div>
                    <div class="tag-list">
                        ${Array.isArray(company.tipo_mercato) 
                            ? company.tipo_mercato.map(m => `<span class="tag">${m}</span>`).join('')
                            : `<span class="tag">${company.tipo_mercato}</span>`
                        }
                    </div>
                </div>` : ''}
            </div>` : ''}

            ${company.prodotto_soluzione || company.descrizione_soluzione || company.classificazione_prodotti || company.use_cases ? `
            <div class="section">
                <h3 class="section-title">Prodotti e Soluzioni</h3>
                ${company.prodotto_soluzione ? `
                <div class="info-item">
                    <div class="info-label">Prodotto/Soluzione</div>
                    <div class="info-value">${company.prodotto_soluzione}</div>
                </div>` : ''}
                ${company.descrizione_soluzione ? `
                <div class="description-box">
                    <div class="info-label">Descrizione Soluzione</div>
                    <div style="margin-top: 8px;">${company.descrizione_soluzione}</div>
                </div>` : ''}
                ${company.classificazione_prodotti && company.classificazione_prodotti.length > 0 ? `
                <div class="info-item">
                    <div class="info-label">Classificazione Prodotti</div>
                    ${company.classificazione_prodotti.map(p => `<div class="list-item">${p}</div>`).join('')}
                </div>` : ''}
                ${company.use_cases ? `
                <div class="description-box">
                    <div class="info-label">Use Cases</div>
                    <div style="margin-top: 8px; font-size: 12px;">${company.use_cases}</div>
                </div>` : ''}
            </div>` : ''}

            ${company.tecnologie_usate ? `
            <div class="section">
                <h3 class="section-title">Tecnologie</h3>
                <div class="description-box">
                    <div class="info-label">Tecnologie Usate</div>
                    <div style="margin-top: 8px;">${company.tecnologie_usate}</div>
                </div>
            </div>` : ''}

            ${company.potenziali_clienti || company.potenziali_partner || company.investitori || company.aziende_controllate ? `
            <div class="section">
                <h3 class="section-title">Partnership e Clienti</h3>
                ${company.potenziali_clienti && company.potenziali_clienti.length > 0 ? `
                <div class="info-item">
                    <div class="info-label">Potenziali Clienti</div>
                    ${company.potenziali_clienti.map(c => `<div class="list-item">${c}</div>`).join('')}
                </div>` : ''}
                ${company.potenziali_partner && company.potenziali_partner.length > 0 ? `
                <div class="info-item">
                    <div class="info-label">Potenziali Partner</div>
                    ${company.potenziali_partner.map(p => `<div class="list-item">${p}</div>`).join('')}
                </div>` : ''}
                ${company.investitori && company.investitori.length > 0 ? `
                <div class="info-item">
                    <div class="info-label">Investitori</div>
                    ${company.investitori.map(i => `<div class="list-item">${i}</div>`).join('')}
                </div>` : ''}
                ${company.aziende_controllate && company.aziende_controllate.length > 0 ? `
                <div class="info-item">
                    <div class="info-label">Aziende Controllate</div>
                    ${company.aziende_controllate.map(a => `<div class="list-item">${a}</div>`).join('')}
                </div>` : ''}
            </div>` : ''}

            ${company.revenues_200K || company.revenues_50K_50M || company.brevetti ? `
            <div class="section">
                <h3 class="section-title">Informazioni Finanziarie e Proprietà</h3>
                <div class="info-grid">
                    ${company.revenues_200K ? `
                    <div class="info-item">
                        <div class="info-label">Ricavi > 200K</div>
                        <div class="info-value">${company.revenues_200K}</div>
                    </div>` : ''}
                    ${company.revenues_50K_50M ? `
                    <div class="info-item">
                        <div class="info-label">Ricavi 50K-50M</div>
                        <div class="info-value">${company.revenues_50K_50M}</div>
                    </div>` : ''}
                    ${company.brevetti ? `
                    <div class="info-item">
                        <div class="info-label">Brevetti</div>
                        <div class="info-value">${company.brevetti}</div>
                    </div>` : ''}
                </div>
            </div>` : ''}

            ${company.notizie_correlate && company.notizie_correlate.length > 0 ? `
            <div class="section">
                <h3 class="section-title">Notizie Correlate</h3>
                ${company.notizie_correlate.map(n => `<div class="list-item">${n}</div>`).join('')}
            </div>` : ''}

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>Documento generato da ICorNet Analysis Platform - ${currentDate}</p>
            </div>
        </body>
        </html>`;
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
                <div className="mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">SUK Analysis</h1>
                </div>
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

                    {/* Action Buttons */}
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
                                    <i data-feather="file-text" className="w-4 h-4 mr-2"></i>
                                    Generate Report
                                </span>
                            )}
                        </button>

                        <button
                            onClick={exportToPDF}
                            disabled={!selectedCompany}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export company information to PDF"
                        >
                            <span className="flex items-center justify-center">
                                <i data-feather="download" className="w-4 h-4 mr-2"></i>
                                Export PDF
                            </span>
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
                                    <div className="mt-3 bg-white p-4 rounded border">
                                        <p className="text-orange-900 leading-relaxed">
                                            {selectedCompany.tecnologie_usate}
                                        </p>
                                    </div>
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

                        {/* Grafo delle Relazioni */}
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
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => viewReport(report.id)}
                                                        className="text-green-600 hover:text-green-800 font-medium"
                                                        title="View PDF"
                                                    >
                                                        <i data-feather="eye" className="w-4 h-4 inline mr-1"></i>
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => downloadReport(report.id)}
                                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                                        title="Download PDF"
                                                    >
                                                        <i data-feather="download" className="w-4 h-4 inline mr-1"></i>
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

            {/* Relationship Details Modal */}
            {showRelationshipModal && selectedRelationship && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold">Dettagli Relazione</h3>
                                    <p className="text-blue-100 text-sm mt-1">Analisi delle connessioni aziendali</p>
                                </div>
                                <button
                                    onClick={closeRelationshipModal}
                                    className="text-white hover:text-gray-200 transition-colors"
                                >
                                    <i data-feather="x" className="w-6 h-6"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Companies Connection */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col items-center">
                                        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold text-center min-w-[120px]">
                                            {selectedRelationship.source}
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1">Azienda Origine</span>
                                    </div>

                                    <div className="flex flex-col items-center mx-4">
                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                            {selectedRelationship.properties?.type || 'Relazione'}
                                        </div>
                                        <i data-feather="arrow-right" className="w-6 h-6 text-gray-400 mt-2"></i>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold text-center min-w-[120px]">
                                            {selectedRelationship.target}
                                        </div>
                                        <span className="text-xs text-gray-500 mt-1">Azienda Destinazione</span>
                                    </div>
                                </div>
                            </div>

                            {/* Relationship Type */}
                            {selectedRelationship.properties?.type && (
                                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                                    <div className="flex items-center">
                                        <i data-feather="tag" className="w-5 h-5 text-green-600 mr-2"></i>
                                        <h4 className="text-lg font-semibold text-green-800">Tipologia Relazione</h4>
                                    </div>
                                    <p className="text-green-700 mt-2 font-medium capitalize">
                                        {selectedRelationship.properties.type}
                                    </p>
                                </div>
                            )}

                            {/* Relationship Properties */}
                            {selectedRelationship.properties && Object.keys(selectedRelationship.properties).length > 0 && (
                                <div>
                                    <div className="flex items-center mb-4">
                                        <i data-feather="info" className="w-5 h-5 text-blue-600 mr-2"></i>
                                        <h4 className="text-lg font-semibold text-gray-900">Dettagli Aggiuntivi</h4>
                                    </div>

                                    <div className="grid gap-4">
                                        {Object.entries(selectedRelationship.properties).map(([key, value]) => {
                                            if (key === 'type') return null; // Già mostrato sopra

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
                                                                                <i 
                                                                                    key={i}
                                                                                    data-feather="star" 
                                                                                    className={`w-4 h-4 ${i < parseInt(value) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                                                                ></i>
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
                                                                    {parseInt(value) >= 4 ? 'Forte' : parseInt(value) >= 3 ? 'Media' : 'Debole'}
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

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end space-x-3">
                            <button
                                onClick={closeRelationshipModal}
                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Make SUK component globally available
window.SUK = SUK;