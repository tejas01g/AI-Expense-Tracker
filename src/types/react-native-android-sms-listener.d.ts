declare module 'react-native-android-sms-listener' {
  interface SMSMessage {
    originatingAddress: string;
    body: string;
    timestamp: number;
  }

  interface Subscription {
    remove: () => void;
  }

  const SmsListener: {
    addListener(callback: (message: SMSMessage) => void): Subscription;
  };

  export default SmsListener;
}