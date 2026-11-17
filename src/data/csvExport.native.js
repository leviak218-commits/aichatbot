import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportCsvFile(contents, filename) {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export usage report CSV',
    UTI: 'public.comma-separated-values-text',
  });
}
