import os
import uuid
from flask import render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image
from app import app, db
from models import Photo

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def get_file_size_str(size_bytes):
    """Convert bytes to human readable format"""
    if size_bytes == 0:
        return "0B"
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.1f} {size_names[i]}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/gallery')
def gallery():
    photos = Photo.query.order_by(Photo.upload_date.desc()).all()
    return render_template('gallery.html', photos=photos, get_file_size_str=get_file_size_str)

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Файл не выбран'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Файл не выбран'}), 400
        
        if file.filename is None:
            return jsonify({'success': False, 'error': 'Файл не выбран'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Недопустимый формат файла. Разрешены: JPG, PNG, GIF'}), 400
        
        # Generate unique filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save the file
        file.save(file_path)
        
        # Validate it's actually an image using Pillow
        try:
            with Image.open(file_path) as img:
                img.verify()
        except Exception:
            os.remove(file_path)
            return jsonify({'success': False, 'error': 'Файл поврежден или не является изображением'}), 400
        
        # Get file info
        file_size = os.path.getsize(file_path)
        mime_type = file.content_type or 'image/jpeg'
        
        # Save to database
        photo = Photo()
        photo.filename = unique_filename
        photo.original_filename = original_filename
        photo.file_size = file_size
        photo.mime_type = mime_type
        
        db.session.add(photo)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Фото успешно загружено!',
            'photo': photo.to_dict()
        })
        
    except Exception as e:
        app.logger.error(f"Upload error: {str(e)}")
        return jsonify({'success': False, 'error': 'Ошибка при загрузке файла'}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/delete/<int:photo_id>', methods=['POST'])
def delete_photo(photo_id):
    try:
        photo = Photo.query.get_or_404(photo_id)
        
        # Delete file from filesystem
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], photo.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete from database
        db.session.delete(photo)
        db.session.commit()
        
        flash('Фото успешно удалено!', 'success')
        return redirect(url_for('gallery'))
        
    except Exception as e:
        app.logger.error(f"Delete error: {str(e)}")
        flash('Ошибка при удалении фото', 'error')
        return redirect(url_for('gallery'))

@app.errorhandler(413)
def too_large(e):
    return jsonify({'success': False, 'error': 'Файл слишком большой. Максимальный размер: 16MB'}), 413