import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DATA_DOC_PATH = 'appData/main'; // collection: appData, doc: main

export async function getAppData() {
  const docRef = doc(db, DATA_DOC_PATH);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().data; // field 'data' contains your JSON
  }
  return null;
}

export async function setAppData(data: any) {
  const docRef = doc(db, DATA_DOC_PATH);
  await setDoc(docRef, { data });
}
