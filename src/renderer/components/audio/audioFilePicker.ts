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
    console.log('[pickAudioFile] Creating file input element');
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    // Safe cleanup function that checks if element is still in DOM
    const safeCleanup = () => {
      console.log('[pickAudioFile] safeCleanup called');
      try {
        console.log('[pickAudioFile] Checking if input is in DOM...', {
          parentNode: input.parentNode,
          isBody: input.parentNode === document.body,
          bodyChildren: document.body.children.length
        });
        // Check if input is still a child of body before removing
        if (input.parentNode === document.body) {
          console.log('[pickAudioFile] Removing input from DOM');
          document.body.removeChild(input);
          console.log('[pickAudioFile] Input removed successfully');
        } else {
          console.log('[pickAudioFile] Input not in body, skipping removal', {
            parentNode: input.parentNode,
            parentNodeType: input.parentNode?.nodeName
          });
        }
      } catch (error) {
        // Element might have already been removed, ignore error
        console.error('[pickAudioFile] Cleanup error:', error);
        console.error('[pickAudioFile] Error details:', {
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          inputParent: input.parentNode,
          inputInBody: input.parentNode === document.body
        });
      }
    };

    // Handle file selection
    let resolved = false;
    
    // Safety timeout: only fires if user cancels and onchange never fires (5 minutes)
    // This is very long to ensure it doesn't interfere with normal file selection
    const safetyTimeout = setTimeout(() => {
      console.log('[pickAudioFile] Safety timeout fired (user likely cancelled)');
      if (!resolved) {
        console.log('[pickAudioFile] Resolving with null (cancelled/no selection)');
        safeCleanup();
        resolved = true;
        resolve(null);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    input.onchange = (event) => {
      console.log('[pickAudioFile] onchange event fired');
      if (resolved) {
        console.log('[pickAudioFile] Already resolved, ignoring onchange');
        return; // Already resolved, ignore
      }
      
      console.log('[pickAudioFile] Clearing safety timeout');
      clearTimeout(safetyTimeout);
      
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0] || null;
      console.log('[pickAudioFile] File selected:', file ? { name: file.name, size: file.size } : 'null');
      
      // Clean up safely after a small delay to avoid React render conflicts
      setTimeout(() => {
        console.log('[pickAudioFile] Executing cleanup in setTimeout');
        safeCleanup();
        resolved = true;
        console.log('[pickAudioFile] Resolving with file:', file ? file.name : 'null');
        resolve(file);
      }, 0);
    };

    // Add to DOM and trigger click
    console.log('[pickAudioFile] Appending input to body and triggering click');
    document.body.appendChild(input);
    console.log('[pickAudioFile] Input appended, body children count:', document.body.children.length);
    input.click();
    console.log('[pickAudioFile] Click triggered, waiting for user selection...');
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


