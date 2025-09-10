import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestoreInstance, initializeFirebase } from './firebase';
import { InitializationData } from './db';

const DATA_DOC_PATH = 'appData/main'; // collection: appData, doc: main

export async function getAppData() {
  const db = initializeFirebase();
  if (!db) return null;
  const docRef = doc(db, DATA_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().data; // field 'data' contains your JSON
  }
  return null;
}

export async function setAppData(data: InitializationData) {
  const db = getFirestoreInstance();
  const docRef = doc(db, DATA_DOC_PATH);
  await setDoc(docRef, { data });
}
