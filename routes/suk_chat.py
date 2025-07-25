from flask import Blueprint, request, jsonify, current_app
import requests
import logging
import os

suk_chat_bp = Blueprint('suk_chat', __name__)

@suk_chat_bp.route('/send-message', methods=['POST'])
def send_chat_message():
    """Send chat message to n8n webhook and return response"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
            
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Get n8n webhook URL from environment
        webhook_url = os.getenv('N8N_CHAT_WEBHOOK_URL')
        if not webhook_url:
            return jsonify({'error': 'N8N_CHAT_WEBHOOK_URL not configured'}), 500
        
        # Prepare payload for n8n webhook
        payload = {
            'message': message,
            'timestamp': data.get('timestamp') if data else None,
            'user_id': data.get('user_id') if data else None
        }
        
        # Send request to n8n webhook
        response = requests.post(
            webhook_url,
            json=payload,
            timeout=30,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            webhook_data = response.json()
            
            # Format the response according to the expected structure
            formatted_response = {
                'prodotti_soluzioni_esistenti': webhook_data.get('prodotti_soluzioni_esistenti', []),
                'potenziali_fornitori': webhook_data.get('potenziali_fornitori', []),
                'timestamp': webhook_data.get('timestamp'),
                'success': True
            }
            
            return jsonify(formatted_response)
        else:
            logging.error(f"n8n webhook failed with status {response.status_code}: {response.text}")
            return jsonify({'error': 'Failed to process message'}), 500
            
    except requests.exceptions.Timeout:
        logging.error("n8n webhook request timed out")
        return jsonify({'error': 'Request timed out'}), 408
    except requests.exceptions.RequestException as e:
        logging.error(f"n8n webhook request failed: {str(e)}")
        return jsonify({'error': 'Failed to connect to chat service'}), 503
    except Exception as e:
        logging.error(f"Unexpected error in chat endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@suk_chat_bp.route('/chat-history', methods=['GET'])
def get_chat_history():
    """Get chat history for the current user"""
    try:
        # For now, return empty history - this could be expanded to store chat history in database
        return jsonify({
            'history': [],
            'success': True
        })
    except Exception as e:
        logging.error(f"Error retrieving chat history: {str(e)}")
        return jsonify({'error': 'Failed to retrieve chat history'}), 500