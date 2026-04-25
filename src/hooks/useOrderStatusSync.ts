import { useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import axios from 'axios';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export function useOrderStatusSync(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;

    const syncStatus = async () => {
      try {
        // Fetch pending/processing orders from Firestore
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', uid),
          where('status', 'in', ['pending', 'processing', 'In progress'])
        );

        let snap;
        try {
          snap = await getDocs(q);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'orders');
          return;
        }

        if (snap.empty) return;

        for (const orderDoc of snap.docs) {
          const order = orderDoc.data();
          if (!order.externalOrderId) continue;

          try {
            const res = await axios.get(`/api/status/${order.externalOrderId}`);
            const apiStatus = res.data.status;

            if (apiStatus && apiStatus.toLowerCase() !== order.status.toLowerCase()) {
              console.log(`Updating order ${orderDoc.id} status from ${order.status} to ${apiStatus}`);
              try {
                await updateDoc(doc(db, 'orders', orderDoc.id), {
                  status: apiStatus.toLowerCase()
                });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `orders/${orderDoc.id}`);
              }
            }
          } catch (err) {
            console.error(`Failed to sync status for order ${orderDoc.id}:`, err);
          }
        }
      } catch (err) {
        console.error('Error in useOrderStatusSync:', err);
      }
    };

    // Initial sync
    syncStatus();

    // Sync every 5 minutes
    const interval = setInterval(syncStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [uid]);
}
