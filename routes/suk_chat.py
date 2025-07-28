from flask import Blueprint, request, jsonify, current_app, session
import requests
import logging
import os
import json
from datetime import datetime
import uuid

suk_chat_bp = Blueprint('suk_chat', __name__)


@suk_chat_bp.route('/chat-history', methods=['GET'])
def get_chat_history():
    """Get chat history for the current user"""
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'User not authenticated'}), 401

        user_id = session['user_id']
        
        from app import db
        from models import ChatHistory
        
        # Get recent chat history for this user
        chat_history = ChatHistory.query.filter_by(user_id=user_id)\
                                       .order_by(ChatHistory.timestamp.desc())\
                                       .limit(50)\
                                       .all()
        
        history_data = []
        for chat in chat_history:
            history_data.append({
                'id': chat.id,
                'session_id': chat.session_id,
                'question': chat.question,
                'response': chat.response,
                'prodotti_soluzioni_esistenti': json.loads(chat.prodotti_soluzioni_esistenti) if chat.prodotti_soluzioni_esistenti else [],
                'potenziali_fornitori': json.loads(chat.potenziali_fornitori) if chat.potenziali_fornitori else [],
                'timestamp': chat.timestamp.isoformat()
            })
        
        return jsonify({'history': history_data}), 200
    
    except Exception as e:
        logging.error(f"Get chat history error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@suk_chat_bp.route('/send-message', methods=['POST'])
def send_chat_message():
    """Send chat message to n8n webhook and return response"""
    try:
        data = request.get_json()
        message = data.get('message', '')

        if not message.strip():
            return jsonify({'error': 'Message cannot be empty'}), 400

        if 'user_id' not in session:
            return jsonify({'error': 'User not authenticated'}), 401

        user_id = session['user_id']
        session_id = str(uuid.uuid4())

        # Get Neo4j service from app config
        neo4j_service = current_app.config.get('neo4j_service')

        if not neo4j_service:
            return jsonify({'error': 'Neo4j service not available'}), 500

        # Query Neo4j for SUK data based on the message
        try:
            # Extract keywords from message for search
            search_terms = message.lower().split()
            existing_products = []
            potential_suppliers = []

            # Search for companies using existing Neo4j service methods
            for term in search_terms:
                if len(term) > 2:  # Only search for terms longer than 2 characters
                    # Search companies by name
                    search_results = neo4j_service.search_companies(term)
                    
                    # Add results as both existing products and potential suppliers
                    for company in search_results:
                        company_data = {
                            'nome_azienda': company.get('nome_azienda', 'N/A'),
                            'settore': company.get('settore', 'N/A') if isinstance(company.get('settore'), str) else ', '.join(company.get('settore', [])),
                            'descrizione': company.get('descrizione', ''),
                            'motivo_del_match': f"Trovato per ricerca: '{term}'"
                        }
                        
                        # Add to existing products if not already present
                        if not any(p['nome_azienda'] == company_data['nome_azienda'] for p in existing_products):
                            existing_products.append({
                                'nome_azienda': company_data['nome_azienda'],
                                'prodotto_soluzione_identificato': company_data['settore'],
                                'motivo_del_match': company_data['motivo_del_match']
                            })
                        
                        # Add to potential suppliers if not already present
                        if not any(p['nome_azienda'] == company_data['nome_azienda'] for p in potential_suppliers):
                            potential_suppliers.append({
                                'nome_azienda': company_data['nome_azienda'],
                                'motivo_del_match': company_data['motivo_del_match']
                            })

            # If no specific search results, get some general companies from Neo4j
            if not existing_products and not potential_suppliers:
                all_companies = neo4j_service.get_companies_list()[:10]  # Get first 10 companies
                for company in all_companies:
                    company_data = {
                        'nome_azienda': company.get('nome_azienda', 'N/A'),
                        'settore': company.get('settore', 'N/A') if isinstance(company.get('settore'), str) else ', '.join(company.get('settore', [])),
                        'descrizione': company.get('descrizione', ''),
                        'motivo_del_match': 'Azienda del database SUK'
                    }
                    
                    existing_products.append({
                        'nome_azienda': company_data['nome_azienda'],
                        'prodotto_soluzione_identificato': company_data['settore'],
                        'motivo_del_match': company_data['motivo_del_match']
                    })
                    
                    potential_suppliers.append({
                        'nome_azienda': company_data['nome_azienda'],
                        'motivo_del_match': company_data['motivo_del_match']
                    })

            # Limit results to avoid overwhelming the user
            existing_products = existing_products[:5]
            potential_suppliers = potential_suppliers[:5]

            # Generate response
            response_text = f"Analisi completata per la richiesta: '{message}'\n\n"
            response_text += f"Trovati {len(existing_products)} prodotti/soluzioni esistenti e {len(potential_suppliers)} potenziali fornitori."

            # Save to chat history
            from app import db
            from models import ChatHistory

            chat_entry = ChatHistory(
                user_id=user_id,
                session_id=session_id,
                question=message,
                response=response_text,
                prodotti_soluzioni_esistenti=json.dumps(existing_products),
                potenziali_fornitori=json.dumps(potential_suppliers)
            )

            db.session.add(chat_entry)
            db.session.commit()

            return jsonify({
                'response': response_text,
                'prodotti_soluzioni_esistenti': existing_products,
                'potenziali_fornitori': potential_suppliers,
                'timestamp': datetime.now().isoformat(),
                'session_id': session_id
            }), 200

        except Exception as neo4j_error:
            logging.error(f"Neo4j query error: {str(neo4j_error)}")

            # Save error response to history
            error_response = 'Mi dispiace, al momento non riesco ad accedere al database delle aziende. Riprova più tardi.'
            from app import db
            from models import ChatHistory
            chat_entry = ChatHistory(
                user_id=user_id,
                session_id=session_id,
                question=message,
                response=error_response,
                prodotti_soluzioni_esistenti=json.dumps([]),
                potenziali_fornitori=json.dumps([])
            )

            db.session.add(chat_entry)
            db.session.commit()

            return jsonify({
                'response': error_response,
                'prodotti_soluzioni_esistenti': [],
                'potenziali_fornitori': [],
                'timestamp': datetime.now().isoformat(),
                'session_id': session_id
            }), 200

    except Exception as e:
        logging.error(f"SUK Chat error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500