from flask import Blueprint, request, jsonify, current_app
import requests
import logging
import os
from datetime import datetime
import json
from models import db, ChatMessage

suk_chat_bp = Blueprint('suk_chat', __name__)


@suk_chat_bp.route('/send-message', methods=['POST'])
def send_chat_message():
    """Send chat message to n8n webhook and return response"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        message = data.get('message', '').strip()
        user_id = data.get('user_id') or 'anonymous'  # Get the user ID with fallback

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        # Get n8n webhook URL from environment
        webhook_url = os.getenv('N8N_CHAT_WEBHOOK_URL')
        if not webhook_url:
            return jsonify({'error':
                            'N8N_CHAT_WEBHOOK_URL not configured'}), 500

        # Prepare payload for n8n webhook
        payload = {
            'message': message,
            'timestamp': data.get('timestamp') if data else None,
            'user_id': user_id if data else None,
            'type': 'SUK'
        }

        # Save user message to database
        user_message = ChatMessage(
            content=message,
            message_type='user',
            user_id=user_id,
            chat_type='SUK',
            timestamp=datetime.utcnow()
        )
        db.session.add(user_message)
        db.session.commit()

        # Send request to n8n webhook
        response = requests.post(webhook_url,
                                 json=payload,
                                 timeout=300,
                                 headers={'Content-Type': 'application/json'})

        if response.status_code == 200:
            webhook_data = response.json()

            # Handle case where webhook_data is a list
            if isinstance(webhook_data, list) and len(webhook_data) > 0:
                # Extract the first item if it's a list
                data_item = webhook_data[0]
                if 'output' in data_item:
                    try:
                        import json
                        output_data = json.loads(
                            data_item['output']) if isinstance(
                                data_item['output'],
                                str) else data_item['output']
                        # Sort and limit results
                        prodotti_esistenti = output_data.get('prodotti_soluzioni_esistenti', [])
                        if prodotti_esistenti:
                            # Sort by ranking descending (higher ranking first)
                            prodotti_esistenti = sorted(prodotti_esistenti, 
                                                      key=lambda x: float(x.get('ranking', 0)), 
                                                      reverse=True)[:10]

                        fornitori = output_data.get('potenziali_fornitori', [])
                        if fornitori:
                            # Sort by ranking descending (higher ranking first)
                            fornitori = sorted(fornitori, 
                                             key=lambda x: float(x.get('ranking', 0)), 
                                             reverse=True)[:10]

                        formatted_response = {
                            'prodotti_soluzioni_esistenti': prodotti_esistenti,
                            'potenziali_fornitori': fornitori,
                            'timestamp':
                            data_item.get('timestamp'),
                            'success':
                            True
                        }

                        # Save assistant response to database
                        assistant_message = ChatMessage(
                            content=json.dumps(formatted_response),
                            message_type='assistant',
                            user_id=user_id,
                            chat_type='SUK',
                            timestamp=datetime.utcnow()
                        )
                        db.session.add(assistant_message)
                        db.session.commit()

                    except (json.JSONDecodeError, TypeError):
                        # Sort and limit results for fallback case
                        prodotti_esistenti = data_item.get('prodotti_soluzioni_esistenti', [])
                        if prodotti_esistenti:
                            prodotti_esistenti = sorted(prodotti_esistenti, 
                                                      key=lambda x: float(x.get('ranking', 0)), 
                                                      reverse=True)[:10]

                        fornitori = data_item.get('potenziali_fornitori', [])
                        if fornitori:
                            fornitori = sorted(fornitori, 
                                             key=lambda x: float(x.get('ranking', 0)), 
                                             reverse=True)[:10]

                        formatted_response = {
                            'prodotti_soluzioni_esistenti': prodotti_esistenti,
                            'potenziali_fornitori': fornitori,
                            'timestamp':
                            data_item.get('timestamp'),
                            'success':
                            True
                        }

                        # Save assistant response to database
                        assistant_message = ChatMessage(
                            content=json.dumps(formatted_response),
                            message_type='assistant',
                            user_id=user_id,
                            chat_type='SUK',
                            timestamp=datetime.utcnow()
                        )
                        db.session.add(assistant_message)
                        db.session.commit()
                else:
                    # Sort and limit results for direct case
                    prodotti_esistenti = data_item.get('prodotti_soluzioni_esistenti', [])
                    if prodotti_esistenti:
                        prodotti_esistenti = sorted(prodotti_esistenti, 
                                                  key=lambda x: float(x.get('ranking', 0)), 
                                                  reverse=True)[:10]

                    fornitori = data_item.get('potenziali_fornitori', [])
                    if fornitori:
                        fornitori = sorted(fornitori, 
                                         key=lambda x: float(x.get('ranking', 0)), 
                                         reverse=True)[:10]

                    formatted_response = {
                        'prodotti_soluzioni_esistenti': prodotti_esistenti,
                        'potenziali_fornitori': fornitori,
                        'timestamp':
                        data_item.get('timestamp'),
                        'success':
                        True
                    }

                    # Save assistant response to database
                    assistant_message = ChatMessage(
                        content=json.dumps(formatted_response),
                        message_type='assistant',
                        user_id=user_id,
                        chat_type='SUK',
                        timestamp=datetime.utcnow()
                    )
                    db.session.add(assistant_message)
                    db.session.commit()
            elif isinstance(webhook_data, dict):
                # Handle nested output structure if present
                if 'output' in webhook_data:
                    try:
                        import json
                        output_data = json.loads(
                            webhook_data['output']) if isinstance(
                                webhook_data['output'],
                                str) else webhook_data['output']
                        # Sort and limit results for dict with output
                        prodotti_esistenti = output_data.get('prodotti_soluzioni_esistenti', [])
                        if prodotti_esistenti:
                            prodotti_esistenti = sorted(prodotti_esistenti, 
                                                      key=lambda x: float(x.get('ranking', 0)), 
                                                      reverse=True)[:10]

                        fornitori = output_data.get('potenziali_fornitori', [])
                        if fornitori:
                            fornitori = sorted(fornitori, 
                                             key=lambda x: float(x.get('ranking', 0)), 
                                             reverse=True)[:10]

                        formatted_response = {
                            'prodotti_soluzioni_esistenti': prodotti_esistenti,
                            'potenziali_fornitori': fornitori,
                            'timestamp':
                            webhook_data.get('timestamp'),
                            'success':
                            True
                        }

                        # Save assistant response to database
                        assistant_message = ChatMessage(
                            content=json.dumps(formatted_response),
                            message_type='assistant',
                            user_id=user_id,
                            chat_type='SUK',
                            timestamp=datetime.utcnow()
                        )
                        db.session.add(assistant_message)
                        db.session.commit()

                    except (json.JSONDecodeError, TypeError):
                        # Sort and limit results for dict fallback
                        prodotti_esistenti = webhook_data.get('prodotti_soluzioni_esistenti', [])
                        if prodotti_esistenti:
                            prodotti_esistenti = sorted(prodotti_esistenti, 
                                                      key=lambda x: float(x.get('ranking', 0)), 
                                                      reverse=True)[:10]

                        fornitori = webhook_data.get('potenziali_fornitori', [])
                        if fornitori:
                            fornitori = sorted(fornitori, 
                                             key=lambda x: float(x.get('ranking', 0)), 
                                             reverse=True)[:10]

                        formatted_response = {
                            'prodotti_soluzioni_esistenti': prodotti_esistenti,
                            'potenziali_fornitori': fornitori,
                            'timestamp':
                            webhook_data.get('timestamp'),
                            'success':
                            True
                        }

                        # Save assistant response to database
                        assistant_message = ChatMessage(
                            content=json.dumps(formatted_response),
                            message_type='assistant',
                            user_id=user_id,
                            chat_type='SUK',
                            timestamp=datetime.utcnow()
                        )
                        db.session.add(assistant_message)
                        db.session.commit()
                else:
                    # Sort and limit results for dict direct response
                    prodotti_esistenti = webhook_data.get('prodotti_soluzioni_esistenti', [])
                    if prodotti_esistenti:
                        prodotti_esistenti = sorted(prodotti_esistenti, 
                                                  key=lambda x: float(x.get('ranking', 0)), 
                                                  reverse=True)[:10]

                    fornitori = webhook_data.get('potenziali_fornitori', [])
                    if fornitori:
                        fornitori = sorted(fornitori, 
                                         key=lambda x: float(x.get('ranking', 0)), 
                                         reverse=True)[:10]

                    # Format the response according to the expected structure
                    formatted_response = {
                        'prodotti_soluzioni_esistenti': prodotti_esistenti,
                        'potenziali_fornitori': fornitori,
                        'timestamp':
                        webhook_data.get('timestamp'),
                        'success':
                        True
                    }

                    # Save assistant response to database
                    assistant_message = ChatMessage(
                        content=json.dumps(formatted_response),
                        message_type='assistant',
                        user_id=user_id,
                        chat_type='SUK',
                        timestamp=datetime.utcnow()
                    )
                    db.session.add(assistant_message)
                    db.session.commit()
            else:
                # Fallback for unexpected data structure
                formatted_response = {
                    'prodotti_soluzioni_esistenti': [],
                    'potenziali_fornitori': [],
                    'timestamp': None,
                    'success': True,
                    'error': 'Unexpected response format'
                }

            return jsonify(formatted_response)
        else:
            logging.error(
                f"n8n webhook failed with status {response.status_code}: {response.text}"
            )
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
    user_id = request.args.get('user_id') or 'anonymous'

    try:
        chat_history = ChatMessage.query.filter_by(
            user_id=user_id, 
            chat_type='SUK'
        ).order_by(ChatMessage.timestamp.asc()).all()
        history = [{
            'content': msg.content,
            'message_type': msg.message_type,
            'timestamp': msg.timestamp.isoformat()
        } for msg in chat_history]
        return jsonify({'history': history, 'success': True})
    except Exception as e:
        logging.error(f"Error retrieving chat history: {str(e)}")
        return jsonify({'error': 'Failed to retrieve chat history'}), 500


@suk_chat_bp.route('/update-conversation-title', methods=['PUT'])
def update_conversation_title():
    """Update conversation title in database"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        user_id = data.get('user_id') or 'anonymous'
        start_timestamp = data.get('start_timestamp')
        end_timestamp = data.get('end_timestamp')
        new_title = data.get('title', '').strip()

        if not start_timestamp or not end_timestamp or not new_title:
            return jsonify({'error': 'Start timestamp, end timestamp, and title are required'}), 400

        # Parse timestamps
        from datetime import datetime
        start_dt = datetime.fromisoformat(start_timestamp.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_timestamp.replace('Z', '+00:00'))

        # Update the first user message in the conversation timeframe with custom title
        user_id_str = str(user_id)
        
        # Find the first user message in the conversation
        first_message = ChatMessage.query.filter(
            ChatMessage.user_id == user_id_str,
            ChatMessage.chat_type == 'SUK',
            ChatMessage.message_type == 'user',
            ChatMessage.timestamp >= start_dt,
            ChatMessage.timestamp <= end_dt
        ).order_by(ChatMessage.timestamp.asc()).first()

        if first_message:
            # Store the custom title in the content as metadata
            original_content = first_message.content
            if not original_content.startswith('CUSTOM_TITLE:'):
                first_message.content = f"CUSTOM_TITLE:{new_title}|{original_content}"
            else:
                # Replace existing custom title
                parts = original_content.split('|', 1)
                if len(parts) > 1:
                    first_message.content = f"CUSTOM_TITLE:{new_title}|{parts[1]}"
                else:
                    first_message.content = f"CUSTOM_TITLE:{new_title}|{original_content}"
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Conversation title updated successfully'
            })
        else:
            return jsonify({'error': 'Conversation not found'}), 404

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating conversation title: {str(e)}")
        return jsonify({'error': 'Failed to update conversation title'}), 500


@suk_chat_bp.route('/delete-conversation', methods=['DELETE'])
def delete_conversation():
    """Delete messages from a specific conversation timeframe"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        user_id = data.get('user_id') or 'anonymous'
        start_timestamp = data.get('start_timestamp')
        end_timestamp = data.get('end_timestamp')

        if not start_timestamp or not end_timestamp:
            return jsonify({'error': 'Start and end timestamps are required'}), 400

        # Parse timestamps
        from datetime import datetime
        start_dt = datetime.fromisoformat(start_timestamp.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_timestamp.replace('Z', '+00:00'))

        # Delete messages within the conversation timeframe
        # Convert user_id to string to match database storage format
        user_id_str = str(user_id)
        
        deleted_count = ChatMessage.query.filter(
            ChatMessage.user_id == user_id_str,
            ChatMessage.chat_type == 'SUK',
            ChatMessage.timestamp >= start_dt,
            ChatMessage.timestamp <= end_dt
        ).delete()

        db.session.commit()

        return jsonify({
            'success': True,
            'deleted_count': deleted_count,
            'message': f'Deleted {deleted_count} messages from conversation'
        })

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error deleting conversation: {str(e)}")
        return jsonify({'error': 'Failed to delete conversation'}), 500