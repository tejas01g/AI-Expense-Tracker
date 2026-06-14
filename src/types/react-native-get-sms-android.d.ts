declare module 'react-native-get-sms-android' {
  interface SmsFilter {
    box?: 'inbox' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued';
    minDate?: number;
    maxDate?: number;
    bodyRegex?: string;
    address?: string;
    read?: 0 | 1;
    _id?: string;
    thread_id?: string;
    maxCount?: number;
  }

  const SmsAndroid: {
    list(
      filter: string,
      failCallback: (error: string) => void,
      successCallback: (count: number, smsList: string) => void
    ): void;
  };

  export default SmsAndroid;
}