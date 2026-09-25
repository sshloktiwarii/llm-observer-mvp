export const fs = {
  readFile: async (path: string, encoding: BufferEncoding = 'utf8'): Promise<string> => {
    try {
      const response = await fetch(`/api/fs?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error}`);
    }
  },

  writeFile: async (path: string, data: string | Uint8Array): Promise<void> => {
    try {
      const content = typeof data === 'string' ? data : Buffer.from(data).toString();
      const response = await fetch('/api/fs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, content }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to write file ${path}: ${error}`);
    }
  },
};
