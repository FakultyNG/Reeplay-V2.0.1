import {useCallback, useEffect, useRef, useState} from 'react';
import {Platform} from 'react-native';
import {finishTransaction as finishStoreTransaction, Purchase, useIAP} from 'react-native-iap';
import {
  getStoreProduct,
  StoreProductConfig,
  verifyStorePurchase,
} from '@/api/payment.api';
import ToastNotification from '@/components/ToastNotifications';

type Target = {videoId: string; seasonId?: string};

export const useStorePurchase = (onGranted?: () => void | Promise<void>) => {
  const [config, setConfig] = useState<StoreProductConfig | null>(null);
  const [displayPrice, setDisplayPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<(Target & {productId: string}) | null>(null);
  const launchRef = useRef(false);

  const onPurchaseSuccess = useCallback(async (purchase: Purchase) => {
    const pending = pendingRef.current;
    if (!pending || purchase.productId !== pending.productId) return;
    try {
      const provider = Platform.OS === 'ios' ? 'apple' : 'google';
      const verified = await verifyStorePurchase({
        provider,
        productId: pending.productId,
        transactionId: provider === 'apple' ? purchase.transactionId ?? purchase.id : undefined,
        purchaseToken: provider === 'google' ? purchase.purchaseToken ?? undefined : undefined,
        videoId: pending.videoId,
        seasonId: pending.seasonId,
      });
      if (!verified.ok) throw new Error(verified.data?.message || 'Purchase verification failed');
      await finishStoreTransaction({purchase, isConsumable: true});
      ToastNotification('success', 'Access unlocked for 30 days');
      await onGranted?.();
    } catch (error) {
      ToastNotification('error', error instanceof Error ? error.message : 'Purchase verification failed');
    } finally {
      pendingRef.current = null;
      launchRef.current = false;
      setBusy(false);
    }
  }, [onGranted]);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess,
    onPurchaseError: error => {
      if (error.code !== 'user-cancelled') ToastNotification('error', error.message);
      pendingRef.current = null;
      launchRef.current = false;
      setBusy(false);
    },
  });

  const load = useCallback(async (target: Target, launch = false) => {
    if (!connected) {
      ToastNotification('info', 'Connecting to the app store. Please try again.');
      return;
    }
    setBusy(launch);
    const response = await getStoreProduct(target.videoId, target.seasonId);
    if (!response.ok || !response.data) {
      setBusy(false);
      ToastNotification('error', response.data?.message || 'Store pricing is unavailable');
      return;
    }
    const nextConfig = response.data.data;
    const productId = Platform.OS === 'ios' ? nextConfig.products.apple : nextConfig.products.google;
    setConfig(nextConfig);
    pendingRef.current = {...target, productId};
    launchRef.current = launch;
    await fetchProducts({skus: [productId], type: 'in-app'});
  }, [connected, fetchProducts]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    const product = products.find(item => item.id === pending.productId);
    if (!product) return;
    setDisplayPrice(product.displayPrice);
    if (!launchRef.current) return;
    launchRef.current = false;
    void requestPurchase({
      type: 'in-app',
      request: {
        apple: {sku: pending.productId, appAccountToken: config?.accountTokens.apple},
        google: {skus: [pending.productId], obfuscatedAccountId: config?.accountTokens.google},
      },
    });
  }, [config, products, requestPurchase]);

  const prepare = useCallback(
    (target: Target) => load(target, false),
    [load],
  );
  const purchase = useCallback(
    (target: Target) => load(target, true),
    [load],
  );

  return {
    connected,
    busy,
    displayPrice,
    prepare,
    purchase,
  };
};
