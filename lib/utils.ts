export function generateUniqueId(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

export function typeWriterEffect(text: string, speed: number = 25): Promise<string> {
  return new Promise((resolve) => {
    let result = '';
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        result += text.charAt(index);
        index++;
      } else {
        clearInterval(interval);
        resolve(result);
      }
    }, speed);
  });
}
