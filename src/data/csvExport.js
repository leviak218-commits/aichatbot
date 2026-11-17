import { Share } from 'react-native';

export async function exportCsvFile(contents, filename) {
  await Share.share({ title: filename, message: contents });
}
