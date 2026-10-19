import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { getElapsedSeconds, subscribeElapsedSeconds } from '../utils/elapsedTime';

type Props = {
  // Момент последней успешной загрузки данных.
  since: Date;
};

// Подпись «Обновлено N сек назад».
export function UpdatedAgo({ since }: Props) {
  const sinceMs = since.getTime();
  const [seconds, setSeconds] = useState(() => getElapsedSeconds(sinceMs));

  useEffect(() => {
    return subscribeElapsedSeconds(sinceMs, setSeconds);
  }, [sinceMs]);

  return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#6b7280',
  },
});
