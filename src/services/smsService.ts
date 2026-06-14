import { PermissionsAndroid, Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import SmsListener from 'react-native-android-sms-listener';

export interface ParsedSMS {
  amount: number;
  merchant: string;
  raw: string;
  date: Date;
  type: 'debit' | 'credit';
}

// ─── Permissions ─────────────────────────────────────────────────────────────
export const requestSMSPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    const readGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission',
        message: 'App needs SMS access to auto-detect expenses',
        buttonPositive: 'Allow',
      }
    );

    const receiveGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      {
        title: 'Receive SMS Permission',
        message: 'App needs this to detect new expense SMS in real-time',
        buttonPositive: 'Allow',
      }
    );

    return (
      readGranted === PermissionsAndroid.RESULTS.GRANTED &&
      receiveGranted === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.error('SMS permission error:', err);
    return false;
  }
};

// ─── Parser ───────────────────────────────────────────────────────────────────
export const parseSMSBody = (body: string, date: number): ParsedSMS | null => {
  const amountRegex = /(?:Rs\.?|INR|₹)\s?([\d,]+(?:\.\d{1,2})?)/i;
  const merchantRegex =
    /(?:at|to|for|towards|@)\s+([A-Za-z0-9\s\-&.]+?)(?:\s+on|\s+via|\s+ref|\s+upi|\.|,|$)/i;
  const debitKeywords = /debited|spent|paid|deducted|withdrawn|purchase|payment/i;
  const creditKeywords = /credited|received|refund|cashback/i;

  const amountMatch = body.match(amountRegex);
  if (!amountMatch) return null;

  const rawAmount = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) return null;

  if (!debitKeywords.test(body) && !creditKeywords.test(body)) return null;

  const merchantMatch = body.match(merchantRegex);
  const merchant = merchantMatch
    ? merchantMatch[1].trim()
    : extractBankName(body);

  const type: 'debit' | 'credit' = creditKeywords.test(body) ? 'credit' : 'debit';

  return {
    amount,
    merchant,
    raw: body,
    date: new Date(date),
    type,
  };
};

// ─── Fallback bank name ───────────────────────────────────────────────────────
const extractBankName = (body: string): string => {
  const banks = [
    'HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak',
    'Paytm', 'PhonePe', 'GPay', 'Amazon',
  ];
  for (const bank of banks) {
    if (body.toLowerCase().includes(bank.toLowerCase())) return bank;
  }
  return 'Unknown';
};

// ─── Read existing inbox SMS (react-native-get-sms-android) ──────────────────
export const readExistingSMS = (): Promise<ParsedSMS[]> => {
  return new Promise((resolve, reject) => {
    const filter = {
      box: 'inbox',
      maxCount: 200,
      minDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // last 30 days
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => {
        console.error('Read SMS failed:', fail);
        reject(new Error(fail));
      },
      (_count: number, smsList: string) => {
        try {
          const messages: { body: string; date: number }[] = JSON.parse(smsList);
          const parsed: ParsedSMS[] = messages.reduce<ParsedSMS[]>((acc, sms) => {
            const result = parseSMSBody(sms.body, sms.date);
            if (result) acc.push(result);
            return acc;
          }, []);
          resolve(parsed);
        } catch (parseErr) {
          console.error('SMS JSON parse error:', parseErr);
          reject(parseErr);
        }
      }
    );
  });
};

// ─── Listen for new incoming SMS (react-native-android-sms-listener) ─────────
export const startSMSListener = (
  onNewSMS: (sms: ParsedSMS) => void
): (() => void) => {
  const subscription = SmsListener.addListener(message => {
    const parsed = parseSMSBody(message.body, message.timestamp);
    if (parsed) {
      onNewSMS(parsed);
    }
  });

  // Return unsubscribe function
  return () => subscription.remove();
};