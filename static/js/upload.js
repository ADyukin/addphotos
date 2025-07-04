document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadResults = document.getElementById('upload-results');
    
    // Modal elements
    const photoSelectionModal = new bootstrap.Modal(document.getElementById('photoSelectionModal'));
    const cameraModal = new bootstrap.Modal(document.getElementById('cameraModal'));
    const takePhotoOption = document.getElementById('take-photo-option');
    
    // Camera elements
    const cameraVideo = document.getElementById('camera-video');
    const cameraCanvas = document.getElementById('camera-canvas');
    const cameraError = document.getElementById('camera-error');
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const uploadPhotosBtn = document.getElementById('upload-photos-btn');
    const photoCounter = document.getElementById('photo-counter');
    const photoCount = document.getElementById('photo-count');
    
    let currentStream = null;
    let capturedPhotos = [];
    let currentPhotoSection = null;

    // Photo placeholder click handlers
    document.querySelectorAll('.photo-placeholder').forEach(placeholder => {
        placeholder.addEventListener('click', function() {
            if (this.classList.contains('has-photo')) {
                // If already has photo, show remove option or do nothing
                return;
            }
            
            currentPhotoSection = this.dataset.section;
            photoSelectionModal.show();
        });
    });

    // Take photo option handler
    takePhotoOption.addEventListener('click', function() {
        setTimeout(() => {
            photoSelectionModal.hide();
            openCamera();
        }, 10);
    });

    // Gallery option handler
    const galleryOption = document.getElementById('gallery-option');
    galleryOption.addEventListener('click', function() {
        setTimeout(() => {
            photoSelectionModal.hide();
            document.getElementById('file-input').click();
        }, 10);
    });

    // Handle file input change
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // Camera functionality
    if (takePhotoBtn) {
        takePhotoBtn.addEventListener('click', function() {
            console.log('Take photo button clicked');
            capturePhoto();
        });
    } else {
        console.error('Take photo button not found');
    }

    if (uploadPhotosBtn) {
        uploadPhotosBtn.addEventListener('click', function() {
            uploadCapturedPhotos();
        });
    }



    // Close camera when modal is hidden
    document.getElementById('cameraModal')?.addEventListener('hidden.bs.modal', function() {
        stopCamera();
    });

    function handleFiles(files) {
        if (files.length === 0) return;

        // Upload files and add to current section
        uploadFiles(files);
    }

    function addPhotoToSection(section, imageUrl, filename) {
        const sectionElement = document.querySelector(`[data-section="${section}"]`);
        if (!sectionElement) return;

        const photoGrid = sectionElement.closest('.photo-section').querySelector('.photo-grid');
        
        // Create new photo element (not placeholder)
        const photoElement = document.createElement('div');
        photoElement.className = 'photo-placeholder has-photo';
        photoElement.dataset.section = section;
        photoElement.innerHTML = `
            <img src="${imageUrl}" alt="${filename}">
            <button class="remove-btn" onclick="removePhoto(this)">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Insert before the main placeholder (always keep it first)
        const mainPlaceholder = photoGrid.querySelector('.photo-placeholder:not(.has-photo)');
        if (mainPlaceholder) {
            photoGrid.insertBefore(photoElement, mainPlaceholder.nextSibling);
        } else {
            photoGrid.appendChild(photoElement);
        }
    }

    // Make removePhoto function global
    window.removePhoto = function(button) {
        const photoElement = button.closest('.photo-placeholder');
        // Only remove if it has a photo and is not the main placeholder
        if (photoElement.classList.contains('has-photo')) {
            photoElement.remove();
        }
    };

    function uploadFiles(files) {
        uploadProgress.style.display = 'block';
        uploadResults.innerHTML = '';

        let uploadedCount = 0;
        const totalFiles = files.length;

        Array.from(files).forEach(file => {
            uploadFile(file, (result) => {
                uploadedCount++;

                if (uploadedCount === totalFiles) {
                    setTimeout(() => {
                        uploadProgress.style.display = 'none';
                    }, 1000);
                }
            });
        });
    }

    function uploadFile(file, callback) {
        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && currentPhotoSection) {
                // Add photo to the current section
                const imageUrl = `/uploads/${data.photo.filename}`;
                addPhotoToSection(currentPhotoSection, imageUrl, data.photo.original_filename);
            }
            // Remove toast notifications
            callback(data);
        })
        .catch(error => {
            console.error('Upload error:', error);
            const errorResult = {
                success: false,
                error: 'Ошибка сети при загрузке файла'
            };
            // Only show errors, not success messages
            if (!errorResult.success) {
                showUploadResult(errorResult, file.name);
            }
            callback(errorResult);
        });
    }

    function showUploadResult(result, filename) {
        const alertClass = result.success ? 'alert-success' : 'alert-danger';
        const icon = result.success ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        const message = result.success ? result.message : result.error;

        const resultElement = document.createElement('div');
        resultElement.className = `alert ${alertClass} alert-dismissible fade show`;
        resultElement.innerHTML = `
            <i class="${icon} me-2"></i>
            <strong>${filename}:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        uploadResults.appendChild(resultElement);

        // Auto-hide success messages after 5 seconds
        if (result.success) {
            setTimeout(() => {
                if (resultElement.parentNode) {
                    resultElement.remove();
                }
            }, 5000);
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Camera functions
    async function openCamera() {
        try {
            // Reset UI state
            cameraError.style.display = 'none';
            cameraVideo.style.display = 'none';
            cameraCanvas.style.display = 'none';
            takePhotoBtn.style.display = 'none';
            uploadPhotosBtn.style.display = 'none';
            
            // Reset photo data
            capturedPhotos = [];
            updatePhotoCounter();
            
            cameraModal.show();
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }
            
            // Request camera access with fallback options
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' }, // Prefer back camera but allow fallback
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            try {
                currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (backCameraError) {
                // Fallback to any available camera
                console.warn('Back camera not available, trying front camera');
                const fallbackConstraints = {
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                };
                currentStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            }
            
            cameraVideo.srcObject = currentStream;
            
            // Wait for video to be ready before showing it
            cameraVideo.onloadedmetadata = function() {
                cameraVideo.style.display = 'block';
                takePhotoBtn.style.display = 'block';
            };
            
        } catch (error) {
            console.error('Camera access error:', error);
            let errorMessage = 'Не удалось получить доступ к камере. ';
            
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Разрешите доступ к камере в настройках браузера.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'Камера не найдена на устройстве.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'Камера не поддерживается в этом браузере.';
            } else {
                errorMessage += 'Проверьте подключение камеры и настройки браузера.';
            }
            
            cameraError.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${errorMessage}`;
            cameraError.style.display = 'block';
        }
    }

    function capturePhoto() {
        console.log('capturePhoto called');
        const canvas = cameraCanvas;
        const video = cameraVideo;
        
        if (!video || !canvas) {
            console.error('Video or canvas element not found');
            return;
        }
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.error('Video not ready yet');
            return;
        }
        
        const context = canvas.getContext('2d');
        
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Show captured photo and approval buttons
        video.style.display = 'none';
        canvas.style.display = 'block';
        takePhotoBtn.style.display = 'none';
        
        // Show approval buttons
        showPhotoApproval(canvas);
    }
    
    function showPhotoApproval(canvas) {
        // Hide shutter button and upload button
        takePhotoBtn.style.display = 'none';
        uploadPhotosBtn.style.display = 'none';
        
        // Remove existing approval buttons if any
        const existingApproval = document.getElementById('photo-approval');
        if (existingApproval) {
            existingApproval.remove();
        }
        
        // Create approval buttons
        const approvalDiv = document.createElement('div');
        approvalDiv.id = 'photo-approval';
        approvalDiv.className = 'photo-approval-controls';
        
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'photo-approval-btn accept';
        acceptBtn.innerHTML = '<i class="fas fa-check"></i>';
        acceptBtn.title = 'Принять фото';
        acceptBtn.onclick = () => acceptPhoto(canvas);
        
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'photo-approval-btn reject';
        rejectBtn.innerHTML = '<i class="fas fa-times"></i>';
        rejectBtn.title = 'Отклонить фото';
        rejectBtn.onclick = () => rejectPhoto();
        
        approvalDiv.appendChild(acceptBtn);
        approvalDiv.appendChild(rejectBtn);
        
        // Insert approval buttons in camera container
        canvas.parentNode.appendChild(approvalDiv);
    }
    
    function acceptPhoto(canvas) {
        // Convert canvas to blob and store
        canvas.toBlob(function(blob) {
            const photoData = {
                blob: blob,
                timestamp: Date.now(),
                section: currentPhotoSection,
                filename: `camera_photo_${Date.now()}.jpg`
            };
            
            capturedPhotos.push(photoData);
            updatePhotoCounter();
            
            // Reset camera for next photo
            resetCameraForNextPhoto();
            
        }, 'image/jpeg', 0.8);
    }
    
    function rejectPhoto() {
        // Reset camera for next photo
        resetCameraForNextPhoto();
    }
    
    function resetCameraForNextPhoto() {
        // Remove approval buttons
        const approvalDiv = document.getElementById('photo-approval');
        if (approvalDiv) {
            approvalDiv.remove();
        }
        
        // Show video again, hide canvas
        cameraVideo.style.display = 'block';
        cameraCanvas.style.display = 'none';
        takePhotoBtn.style.display = 'block';
        
        // Update photo counter and upload button visibility
        updatePhotoCounter();
    }
    
    function updatePhotoCounter() {
        if (photoCount) {
            photoCount.textContent = capturedPhotos.length;
        }
        
        // Show counter and upload button if photos exist
        if (capturedPhotos.length > 0) {
            if (photoCounter) photoCounter.style.display = 'block';
            uploadPhotosBtn.style.display = 'block';
        } else {
            if (photoCounter) photoCounter.style.display = 'none';
            uploadPhotosBtn.style.display = 'none';
        }
    }
    
    function showTempMessage(message, type) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        const tempAlert = document.createElement('div');
        tempAlert.className = `alert ${alertClass} position-fixed top-0 start-50 translate-middle-x mt-3`;
        tempAlert.style.zIndex = '9999';
        tempAlert.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'} me-2"></i>
            ${message}
        `;
        
        document.body.appendChild(tempAlert);
        
        // Auto-remove after 2 seconds
        setTimeout(() => {
            if (tempAlert.parentNode) {
                tempAlert.remove();
            }
        }, 2000);
    }
    
    function uploadCapturedPhotos() {
        if (capturedPhotos.length === 0) {
            return;
        }
        
        uploadProgress.style.display = 'block';
        uploadResults.innerHTML = '';
        
        let uploadedCount = 0;
        const totalPhotos = capturedPhotos.length;
        
        // Create File objects from captured photos
        capturedPhotos.forEach(photoData => {
            const file = new File([photoData.blob], photoData.filename, {
                type: 'image/jpeg'
            });
            
            uploadFile(file, (result) => {
                uploadedCount++;
                
                if (uploadedCount === totalPhotos) {
                    setTimeout(() => {
                        uploadProgress.style.display = 'none';
                    }, 1000);
                }
            });
        });
        
        // Close camera modal
        cameraModal.hide();
        
        // Clear captured photos
        clearCapturedPhotos();
    }
    
    function clearCapturedPhotos() {
        capturedPhotos = [];
        updatePhotoCounter();
        uploadPhotosBtn.style.display = 'none';
    }
    
    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                track.stop();
            });
            currentStream = null;
        }
        
        // Clean up approval buttons
        const approvalDiv = document.getElementById('photo-approval');
        if (approvalDiv) {
            approvalDiv.remove();
        }
        
        // Reset states
        capturedPhotos = [];
        cameraVideo.style.display = 'none';
        cameraCanvas.style.display = 'none';
        cameraError.style.display = 'none';
        takePhotoBtn.style.display = 'none';
        uploadPhotosBtn.style.display = 'none';
        clearPhotosBtn.style.display = 'none';
        photoCounter.style.display = 'none';
        updatePhotoCounter();
    }
});