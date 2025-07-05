from datetime import datetime

class PhotoManager:
    def __init__(self):
        self.photos = []
        self.next_id = 1
    
    def add_photo(self, filename, original_filename, file_size, mime_type):
        photo = {
            'id': self.next_id,
            'filename': filename,
            'original_filename': original_filename,
            'file_size': file_size,
            'mime_type': mime_type,
            'upload_date': datetime.utcnow()
        }
        self.photos.append(photo)
        self.next_id += 1
        return photo
    
    def get_all_photos(self):
        return sorted(self.photos, key=lambda x: x['upload_date'], reverse=True)
    
    def get_photo_by_id(self, photo_id):
        for photo in self.photos:
            if photo['id'] == photo_id:
                return photo
        return None
    
    def delete_photo(self, photo_id):
        for i, photo in enumerate(self.photos):
            if photo['id'] == photo_id:
                return self.photos.pop(i)
        return None

# Глобальный экземпляр менеджера фото
photo_manager = PhotoManager()
