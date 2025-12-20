// audioFilePicker.ts - Utility for selecting audio files
// Works with both browser file input and Electron file dialog

/**
 * Open file picker and return selected audio file
 * 
 * @param accept - MIME types to accept (default: all supported audio formats)
 * @returns Promise that resolves with selected File or null if cancelled
 */
export async function pickAudioFile(
  accept: string = 'audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac'
): Promise<File | null> {
  return new Promise((resolve) => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    // Handle file selection
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0] || null;
      
      // Clean up
      document.body.removeChild(input);
      
      resolve(file);
    };

    // Handle cancellation
    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };

    // Add to DOM and trigger click
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Validate if a file is a valid audio file
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 500MB.`,
    };
  }

  // Check if file has a name
  if (!file.name || file.name.trim() === '') {
    return {
      valid: false,
      error: 'File has no name',
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
  
  if (!extension || !supportedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file format: .${extension}. Supported formats: ${supportedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}


