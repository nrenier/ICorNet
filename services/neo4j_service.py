from neo4j import GraphDatabase
import logging

class Neo4jService:
    def __init__(self, uri, username, password):
        try:
            self.driver = GraphDatabase.driver(uri, auth=(username, password))
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            logging.info("Neo4j connection established")
        except Exception as e:
            logging.error(f"Neo4j connection failed: {str(e)}")
            self.driver = None

    def close(self):
        if self.driver:
            self.driver.close()

    def get_company_count(self):
        """Get total count of companies in Neo4j"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return 150

        try:
            with self.driver.session() as session:
                result = session.run("MATCH (n:SUK) RETURN count(n) as count")
                record = result.single()
                return record["count"] if record else 0
        except Exception as e:
            logging.error(f"Error getting company count: {str(e)}")
            return 0

    def get_companies_list(self):
        """Get list of all companies with their details"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return [
                {"nome_azienda": "Acme Corporation", "settore": "Technology", "descrizione": "Software development company"},
                {"nome_azienda": "Beta Industries", "settore": "Manufacturing", "descrizione": "Industrial equipment manufacturer"},
                {"nome_azienda": "Gamma Solutions", "settore": "Consulting", "descrizione": "Business consulting services"},
                {"nome_azienda": "Delta Logistics", "settore": "Transportation", "descrizione": "Logistics and shipping services"},
                {"nome_azienda": "Epsilon Energy", "settore": "Energy", "descrizione": "Renewable energy solutions"}
            ]

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.nome_azienda IS NOT NULL
                    RETURN properties(n) as company_properties
                    ORDER BY n.nome_azienda
                """)
                return [record["company_properties"] for record in result]
        except Exception as e:
            logging.error(f"Error getting companies list: {str(e)}")
            return []

    def get_sector_aggregations(self):
        """Get aggregated data by sector - unwind arrays and count individual elements"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return [
                {"settore": "Intelligenza Artificiale", "count": 4, "sample_companies": ["Company1", "Company2", "Company3"]},
                {"settore": "Analisi dei Dati", "count": 3, "sample_companies": ["Company2", "Company4"]},
                {"settore": "Tecnologie digitali", "count": 1, "sample_companies": ["Company1"]},
                {"settore": "Riconoscimento delle immagini", "count": 1, "sample_companies": ["Company1"]},
                {"settore": "IoT", "count": 1, "sample_companies": ["Company1"]}
            ]

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.settore IS NOT NULL
                    UNWIND n.settore AS settore_item
                    WITH settore_item, collect(DISTINCT n.nome_azienda) AS companies
                    RETURN settore_item as settore, 
                           size(companies) as count,
                           companies[0..5] as sample_companies
                    ORDER BY count DESC
                    LIMIT 10
                """)
                return [record.data() for record in result]
        except Exception as e:
            logging.error(f"Error getting sector aggregations: {str(e)}")
            return []

    def get_company_details(self, company_name):
        """Get detailed information for a specific company"""
        if not self.driver:
            logging.warning("Neo4j driver not available")
            return None

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.nome_azienda = $company_name
                    RETURN properties(n) as company_properties
                """, company_name=company_name)

                record = result.single()
                if record:
                    return record["company_properties"]
                return None
        except Exception as e:
            logging.error(f"Error getting company details: {str(e)}")
            return None

    def search_companies(self, search_term):
        """Search companies by name"""
        if not self.driver:
            logging.warning("Neo4j driver not available")
            return []

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.nome_azienda CONTAINS $search_term
                    RETURN properties(n) as company_properties
                    ORDER BY n.nome_azienda
                    LIMIT 20
                """, search_term=search_term)
                return [record["company_properties"] for record in result]
        except Exception as e:
            logging.error(f"Error searching companies: {str(e)}")
            return []

    def get_company_relationships(self, company_name):
        """Get relationships for a specific company"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return {
                'nodes': [
                    {'id': company_name, 'name': company_name, 'type': 'center'},
                    {'id': 'Related Company 1', 'name': 'Related Company 1', 'type': 'related'},
                    {'id': 'Related Company 2', 'name': 'Related Company 2', 'type': 'related'}
                ],
                'edges': [
                    {
                        'source': company_name,
                        'target': 'Related Company 1',
                        'weight': 5,
                        'type': 'partnership',
                        'properties': {'weight': 5, 'type': 'partnership', 'description': 'Strategic partnership'}
                    },
                    {
                        'source': company_name,
                        'target': 'Related Company 2',
                        'weight': 4,
                        'type': 'client',
                        'properties': {'weight': 4, 'type': 'client', 'description': 'Client relationship'}
                    }
                ]
            }

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH p=(n:SUK)-[r]->(m:SUK) 
                    WHERE n.nome_azienda = $company_name AND r.weight >= 3 
                    RETURN n.nome_azienda as source_name, 
                           m.nome_azienda as target_name,
                           properties(r) as relationship_properties,
                           r.weight as weight,
                           type(r) as type
                """, company_name=company_name)

                relationships = []
                related_companies = set()

                for record in result:
                    source = record["source_name"]
                    target = record["target_name"]
                    weight = record["weight"]
                    rel_props = record["relationship_properties"]
                    rel_type = record["type"]

                    # Aggiungi il tipo alle proprietà della relazione
                    if rel_props is None:
                        rel_props = {}
                    rel_props['type'] = rel_type

                    relationships.append({
                        'source': source,
                        'target': target,
                        'weight': weight,
                        'type': rel_type,
                        'properties': rel_props
                    })

                    related_companies.add(source)
                    related_companies.add(target)

                # Create nodes
                nodes = []
                for company in related_companies:
                    node_type = 'center' if company == company_name else 'related'
                    nodes.append({
                        'id': company,
                        'name': company,
                        'type': node_type
                    })

                return {
                    'nodes': nodes,
                    'edges': relationships
                }

        except Exception as e:
            logging.error(f"Error getting company relationships: {str(e)}")
            return {'nodes': [], 'edges': []}

    def get_total_sector_count(self):
        """Get total count of unique sectors in Neo4j"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return 15

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE n.settore IS NOT NULL
                    UNWIND n.settore AS settore_item
                    RETURN count(DISTINCT settore_item) as total_sectors
                """)
                record = result.single()
                return record["total_sectors"] if record else 0
        except Exception as e:
            logging.error(f"Error getting total sector count: {str(e)}")
            return 0

    def get_companies_by_sector(self, sector):
        """Get all companies for a specific sector"""
        if not self.driver:
            logging.warning("Neo4j driver not available")
            return [
                {
                    "nome_azienda": "Mock Company 1",
                    "settore": [sector],
                    "descrizione": "Mock description for testing",
                    "sito_web": "https://example.com"
                },
                {
                    "nome_azienda": "Mock Company 2", 
                    "settore": [sector],
                    "descrizione": "Another mock description",
                    "sito_web": "https://example2.com"
                }
            ]

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:SUK) 
                    WHERE ANY(settore_item IN n.settore WHERE toLower(settore_item) = toLower($sector))
                    RETURN n.nome_azienda as nome_azienda,
                           n.settore as settore,
                           n.descrizione as descrizione,
                           n.indirizzo as indirizzo,
                           n.sito_web as sito_web,
                           n.TRL as TRL,
                           n.data_inizio_attivita as data_inizio_attivita
                    ORDER BY n.nome_azienda
                """, sector=sector)
                return [record.data() for record in result]
        except Exception as e:
            logging.error(f"Error getting companies by sector: {str(e)}")
            return []

    def get_federterziario_companies_list(self):
        """Get list of all FEDERTERZIARIO companies with their details"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return [
                {"nome_azienda": "Federterziario Corp", "settore": "Services", "descrizione": "Service company"},
                {"nome_azienda": "Tertiary Solutions", "settore": "Consulting", "descrizione": "Business consulting"},
                {"nome_azienda": "Service Industries", "settore": "Technology", "descrizione": "Tech services"},
            ]

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:FEDERTERZIARIO) 
                    WHERE n.nome_azienda IS NOT NULL
                    RETURN properties(n) as company_properties
                    ORDER BY n.nome_azienda
                """)
                return [record["company_properties"] for record in result]
        except Exception as e:
            logging.error(f"Error getting FEDERTERZIARIO companies list: {str(e)}")
            return []

    def get_federterziario_company_details(self, company_name):
        """Get detailed information for a specific FEDERTERZIARIO company"""
        if not self.driver:
            logging.warning("Neo4j driver not available")
            return None

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:FEDERTERZIARIO) 
                    WHERE n.nome_azienda = $company_name
                    RETURN properties(n) as company_properties
                """, company_name=company_name)

                record = result.single()
                if record:
                    return record["company_properties"]
                return None
        except Exception as e:
            logging.error(f"Error getting FEDERTERZIARIO company details: {str(e)}")
            return None

    def get_federterziario_company_relationships(self, company_name):
        """Get relationships for a specific FEDERTERZIARIO company"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return {
                'nodes': [
                    {'id': company_name, 'name': company_name, 'type': 'center'},
                    {'id': 'Related Company 1', 'name': 'Related Company 1', 'type': 'related'},
                    {'id': 'Related Company 2', 'name': 'Related Company 2', 'type': 'related'}
                ],
                'edges': [
                    {
                        'source': company_name,
                        'target': 'Related Company 1',
                        'weight': 5,
                        'type': 'partnership',
                        'properties': {'weight': 5, 'type': 'partnership', 'description': 'Strategic partnership'}
                    },
                    {
                        'source': company_name,
                        'target': 'Related Company 2',
                        'weight': 4,
                        'type': 'client',
                        'properties': {'weight': 4, 'type': 'client', 'description': 'Client relationship'}
                    }
                ]
            }

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH p=(n:FEDERTERZIARIO)-[r]->(m:FEDERTERZIARIO) 
                    WHERE n.nome_azienda = $company_name AND r.weight >= 3 
                    RETURN n.nome_azienda as source_name, 
                           m.nome_azienda as target_name,
                           properties(r) as relationship_properties,
                           r.weight as weight,
                           type(r) as type
                """, company_name=company_name)

                relationships = []
                related_companies = set()

                for record in result:
                    source = record["source_name"]
                    target = record["target_name"]
                    weight = record["weight"]
                    rel_props = record["relationship_properties"]
                    rel_type = record["type"]

                    # Aggiungi il tipo alle proprietà della relazione
                    if rel_props is None:
                        rel_props = {}
                    rel_props['type'] = rel_type

                    relationships.append({
                        'source': source,
                        'target': target,
                        'weight': weight,
                        'type': rel_type,
                        'properties': rel_props
                    })

                    related_companies.add(source)
                    related_companies.add(target)

                # Create nodes
                nodes = []
                for company in related_companies:
                    node_type = 'center' if company == company_name else 'related'
                    nodes.append({
                        'id': company,
                        'name': company,
                        'type': node_type
                    })

                return {
                    'nodes': nodes,
                    'edges': relationships
                }

        except Exception as e:
            logging.error(f"Error getting FEDERTERZIARIO company relationships: {str(e)}")
            return {'nodes': [], 'edges': []}

    def get_startup_companies_list(self):
        """Get list of all STARTUP companies with their details"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return [
                {"nome_azienda": "Startup Corp", "tipologia_attivita": ["Software development"]},
                {"nome_azienda": "Tech Solutions", "tipologia_attivita": ["IoT solutions", "Automation"]},
                {"nome_azienda": "Innovation Hub", "tipologia_attivita": ["Digital consulting"]},
            ]

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:STARTUP) 
                    WHERE n.nome_azienda IS NOT NULL
                    RETURN properties(n) as company_properties
                    ORDER BY n.nome_azienda
                """)
                return [record["company_properties"] for record in result]
        except Exception as e:
            logging.error(f"Error getting STARTUP companies list: {str(e)}")
            return []

    def get_startup_company_details(self, company_name):
        """Get detailed information for a specific STARTUP company"""
        if not self.driver:
            logging.warning("Neo4j driver not available")
            return None

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n:STARTUP) 
                    WHERE n.nome_azienda = $company_name
                    RETURN properties(n) as company_properties
                """, company_name=company_name)

                record = result.single()
                if record:
                    return record["company_properties"]
                return None
        except Exception as e:
            logging.error(f"Error getting STARTUP company details: {str(e)}")
            return None

    def get_startup_company_relationships(self, company_name):
        """Get relationships for a specific STARTUP company"""
        if not self.driver:
            logging.warning("Neo4j driver not available, returning mock data")
            return {
                'nodes': [
                    {'id': company_name, 'name': company_name, 'type': 'center'},
                    {'id': 'Related Company 1', 'name': 'Related Company 1', 'type': 'related'},
                    {'id': 'Related Company 2', 'name': 'Related Company 2', 'type': 'related'}
                ],
                'edges': [
                    {
                        'source': company_name,
                        'target': 'Related Company 1',
                        'weight': 5,
                        'type': 'partnership',
                        'properties': {'weight': 5, 'type': 'partnership', 'description': 'Strategic partnership'}
                    },
                    {
                        'source': company_name,
                        'target': 'Related Company 2',
                        'weight': 4,
                        'type': 'client',
                        'properties': {'weight': 4, 'type': 'client', 'description': 'Client relationship'}
                    }
                ]
            }

        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH p=(n:STARTUP)-[r]->(m:STARTUP) 
                    WHERE n.nome_azienda = $company_name AND r.weight >= 3 
                    RETURN n.nome_azienda as source_name, 
                           m.nome_azienda as target_name,
                           properties(r) as relationship_properties,
                           r.weight as weight,
                           type(r) as type
                """, company_name=company_name)

                relationships = []
                related_companies = set()

                for record in result:
                    source = record["source_name"]
                    target = record["target_name"]
                    weight = record["weight"]
                    rel_props = record["relationship_properties"]
                    rel_type = record["type"]

                    # Aggiungi il tipo alle proprietà della relazione
                    if rel_props is None:
                        rel_props = {}
                    rel_props['type'] = rel_type

                    relationships.append({
                        'source': source,
                        'target': target,
                        'weight': weight,
                        'type': rel_type,
                        'properties': rel_props
                    })

                    related_companies.add(source)
                    related_companies.add(target)

                # Create nodes
                nodes = []
                for company in related_companies:
                    node_type = 'center' if company == company_name else 'related'
                    nodes.append({
                        'id': company,
                        'name': company,
                        'type': node_type
                    })

                return {
                    'nodes': nodes,
                    'edges': relationships
                }

        except Exception as e:
            logging.error(f"Error getting STARTUP company relationships: {str(e)}")
            return {'nodes': [], 'edges': []}