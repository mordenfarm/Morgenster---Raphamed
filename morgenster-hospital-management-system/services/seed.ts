import { auth, db } from "./firebase";
import { Role, UserProfile, Ward } from "../types";
import firebase from "firebase/compat/app";

const usersToSeed = [
  // Administration
  { name: 'Admin', surname: 'User', email: 'admin@morgenster.com', password: 'password123', role: Role.Admin, department: 'Administration' },
  { name: 'Tatenda', surname: 'Mugabe', email: 'admin.tatenda@morgenster.com', password: 'password123', role: Role.Admin, department: 'Administration' },

  // Doctors
  { name: 'Tinashe', surname: 'Chiremba', email: 'doctor.tinashe@morgenster.com', password: 'password123', role: Role.Doctor, department: 'Doctors' },
  { name: 'Anesu', surname: 'Musakwa', email: 'doctor.anesu@morgenster.com', password: 'password123', role: Role.Doctor, department: 'Doctors' },
  { name: 'Fadzai', surname: 'Mutasa', email: 'doctor.fadzai@morgenster.com', password: 'password123', role: Role.Doctor, department: 'Doctors' },

  // Accounts
  { name: 'Rudo', surname: 'Gumbo', email: 'accountant.rudo@morgenster.com', password: 'password123', role: Role.Accountant, department: 'Accounts' },
  { name: 'Blessing', surname: 'Moyo', email: 'accounts.blessing@morgenster.com', password: 'password123', role: Role.AccountsAssistant, department: 'Accounts' },
  { name: 'Rutendo', surname: 'Mari', email: 'accounts.rutendo@morgenster.com', password: 'password123', role: Role.AccountsClerk, department: 'Accounts' },
  { name: 'Farai', surname: 'Dube', email: 'accounts.farai@morgenster.com', password: 'password123', role: Role.AccountsClerk, department: 'Accounts' },

  // Wards / Vitals
  { name: 'Simbisai', surname: 'Moyo', email: 'nurse.simbisai@morgenster.com', password: 'password123', role: Role.Nurse, department: 'Wards', wardId: 'female-ward', wardName: 'Female Ward' },
  { name: 'Chido', surname: 'Govera', email: 'nurse.chido@morgenster.com', password: 'password123', role: Role.Nurse, department: 'Wards', wardId: 'male-ward', wardName: 'Male Ward' },
  { name: 'Fungai', surname: 'Maposa', email: 'nurse.fungai@morgenster.com', password: 'password123', role: Role.Nurse, department: 'Wards', wardId: 'maternity-ward', wardName: 'Maternity Ward' },
  { name: 'Tapiwa', surname: 'Zizhou', email: 'nurse.tapiwa@morgenster.com', password: 'password123', role: Role.Nurse, department: 'Wards', wardId: 'childrens-ward', wardName: 'Childrens Ward' },
  { name: 'Chengeto', surname: 'Shumba', email: 'vitals.chengeto@morgenster.com', password: 'password123', role: Role.VitalsChecker, department: 'OPD' },
  { name: 'Tafadzwa', surname: 'Ncube', email: 'vitals.tafadzwa@morgenster.com', password: 'password123', role: Role.VitalsChecker, department: 'OPD' },

  // Laboratory
  { name: 'Farai', surname: 'Maoko', email: 'lab.farai@morgenster.com', password: 'password123', role: Role.LaboratoryTechnician, department: 'Laboratory' },
  { name: 'Danai', surname: 'Shonhiwa', email: 'lab.danai@morgenster.com', password: 'password123', role: Role.LaboratoryTechnician, department: 'Laboratory' },

  // Radiology
  { name: 'Chipo', surname: 'Ziso', email: 'xray.chipo@morgenster.com', password: 'password123', role: Role.Radiologist, department: 'Radiology' },
  { name: 'Nyasha', surname: 'Muchena', email: 'xray.nyasha@morgenster.com', password: 'password123', role: Role.Radiologist, department: 'Radiology' },

  // Pharmacy
  { name: 'Tendai', surname: 'Mushonga', email: 'pharmacy.tendai@morgenster.com', password: 'password123', role: Role.PharmacyTechnician, department: 'Pharmacy' },
  { name: 'Moreblessing', surname: 'Shiri', email: 'pharmacy.moreblessing@morgenster.com', password: 'password123', role: Role.PharmacyTechnician, department: 'Pharmacy' },
  { name: 'Ropafadzo', surname: 'Chadenga', email: 'dispensary.ropafadzo@morgenster.com', password: 'password123', role: Role.DispensaryAssistant, department: 'Pharmacy' },

  // Rehabilitation
  { name: 'Kudakwashe', surname: 'Gumbo', email: 'rehab.kuda@morgenster.com', password: 'password123', role: Role.RehabilitationTechnician, department: 'Rehabilitation' },
  { name: 'Mufaro', surname: 'Hove', email: 'rehab.mufaro@morgenster.com', password: 'password123', role: Role.RehabilitationTechnician, department: 'Rehabilitation' },
];

const seedWards = async () => {
    console.log("Checking wards...");
    const wardsCol = db.collection("wards");
    const snapshot = await wardsCol.get();
    if (!snapshot.empty) {
        console.log("Wards already seeded.");
        return;
    }

    console.log("Seeding wards...");
    const wards: Omit<Ward, 'id'>[] = [
        { name: 'Female Ward', totalBeds: 20, pricePerDay: 40 },
        { name: 'Male Ward', totalBeds: 20, pricePerDay: 40 },
        { name: 'Childrens Ward', totalBeds: 15, pricePerDay: 50 },
        { name: 'ICU', totalBeds: 5, pricePerDay: 150 },
        { name: 'Maternity Ward', totalBeds: 10, pricePerDay: 60 },
        { name: 'Theater', totalBeds: 2, pricePerDay: 200 },
    ];

    const batch = db.batch();
    wards.forEach(ward => {
        // Use a predictable ID for seeding purposes
        const docId = ward.name.toLowerCase().replace(' ', '-').replace('\'', '');
        const docRef = wardsCol.doc(docId);
        batch.set(docRef, ward);
    });
    await batch.commit();
    console.log("Wards seeded successfully.");
}

const seedUsers = async () => {
  console.log("Checking if users need to be seeded...");
  const usersCollection = db.collection("users");
  const usersSnapshot = await usersCollection.get();

  if (usersSnapshot.docs.length >= usersToSeed.length) {
    console.log("Users collection appears to be seeded. Skipping seeding.");
    return;
  }

  console.log("Seeding users...");
  try {
    for (const userData of usersToSeed) {
      try {
        // We attempt to create user, but if they exist in Auth, we just ensure their profile is in Firestore
        const userCredential = await auth.createUserWithEmailAndPassword(userData.email, userData.password)
          .catch(error => {
            if (error.code === 'auth/email-already-in-use') {
              console.warn(`User ${userData.email} already exists in Auth. Will ensure Firestore profile exists.`);
              return null; // Return null to signify we don't need to create profile from new credential
            }
            throw error; // Rethrow other errors
          });

        if (userCredential && userCredential.user) {
          const user = userCredential.user;
          const userProfile: Omit<UserProfile, 'id'> = {
            name: userData.name,
            surname: userData.surname,
            email: userData.email,
            role: userData.role,
            department: userData.department,
            ...(userData.wardId && { wardId: userData.wardId }),
            ...(userData.wardName && { wardName: userData.wardName }),
          };
          await db.collection("users").doc(user.uid).set(userProfile);
          console.log(`Successfully created user: ${userData.email}`);
        }
      } catch (error: any) {
        if (error.code !== 'auth/email-already-in-use') {
          console.error(`Error processing user ${userData.email}:`, error);
        }
      }
    }
    console.log("User seeding process completed.");
  } catch (error) {
    console.error("A critical error occurred during user seeding:", error);
  }
};

const seedDepartments = async () => {
    console.log("Checking departments...");
    const departmentsCol = db.collection("departments");
    const snapshot = await departmentsCol.get();
    if (!snapshot.empty) {
        console.log("Departments already seeded.");
        return;
    }

    console.log("Seeding departments...");
    const departments = [
        "Administration", "Accounts", "Doctors", "OPD", "Wards",
        "Laboratory", "Radiology", "Pharmacy", "Rehabilitation"
    ];
    const batch = db.batch();
    departments.forEach(name => {
        const docRef = departmentsCol.doc(name.toLowerCase().replace(' ', '-'));
        batch.set(docRef, { name });
    });
    await batch.commit();
    console.log("Departments seeded successfully.");
};

const seedPriceList = async () => {
    console.log("Checking price list...");
    const priceListCol = db.collection("priceList");
    const snapshot = await priceListCol.get();
    if (!snapshot.empty) {
        console.log("Price list already seeded.");
        return;
    }

    console.log("Seeding price list...");
    const items = [
        { name: 'GP Consultation', department: 'OPD', unitPrice: 15.00 },
        { name: 'Paracetamol (strip)', department: 'Pharmacy', unitPrice: 1.50 },
        { name: 'Amoxicillin (strip)', department: 'Pharmacy', unitPrice: 5.00 },
        { name: 'Full Blood Count', department: 'Laboratory', unitPrice: 25.00 },
        { name: 'Malaria Test (RDT)', department: 'Laboratory', unitPrice: 8.00 },
        { name: 'Chest X-Ray', department: 'Radiology', unitPrice: 40.00 },
    ];
    const batch = db.batch();
    items.forEach(item => {
        const docRef = priceListCol.doc();
        batch.set(docRef, { 
            ...item, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    await batch.commit();
    console.log("Price list seeded successfully.");
};

const seedPatients = async () => {
    console.log("Checking patients...");
    const patientsCol = db.collection("patients");
    const snapshot = await patientsCol.get();
    if (!snapshot.empty) {
        console.log("Patients already seeded.");
        return;
    }
    console.log("Seeding patients...");
    const patients = [
        {
            hospitalNumber: 'MH0001', name: 'John', surname: 'Doe', dateOfBirth: '1985-05-20', age: 39, maritalStatus: 'Married', gender: 'Male', countryOfBirth: 'Zimbabwe', phoneNumber: '0777111222', residentialAddress: '123 Main St, Harare', nokName: 'Jane', nokSurname: 'Doe', nokPhoneNumber: '0777111223', nokAddress: '123 Main St, Harare', registeredBy: 'dummy_user_id', registrationDate: new Date().toISOString(),
            status: 'Admitted', financials: { totalBill: 0, amountPaid: 0, balance: 0 }, currentWardId: 'male-ward', currentWardName: 'Male Ward', currentBedNumber: 5
        },
        {
            hospitalNumber: 'MH0002', name: 'Mary', surname: 'Moyo', dateOfBirth: '1992-11-10', age: 31, maritalStatus: 'Single', gender: 'Female', countryOfBirth: 'Zimbabwe', phoneNumber: '0777333444', residentialAddress: '456 Park Ave, Masvingo', nokName: 'Peter', nokSurname: 'Moyo', nokPhoneNumber: '0777333445', nokAddress: '456 Park Ave, Masvingo', registeredBy: 'dummy_user_id', registrationDate: new Date().toISOString(),
            status: 'PendingDischarge', financials: { totalBill: 75.50, amountPaid: 50.00, balance: 25.50 }, currentWardId: 'female-ward', currentWardName: 'Female Ward', currentBedNumber: 2
        },
        {
            hospitalNumber: 'MH0003', name: 'Tafadzwa', surname: 'Chauke', dateOfBirth: '2001-01-15', age: 23, maritalStatus: 'Single', gender: 'Male', countryOfBirth: 'Zimbabwe', phoneNumber: '0777555666', residentialAddress: '789 High St, Gweru', nokName: 'Rudo', nokSurname: 'Chauke', nokPhoneNumber: '0777555667', nokAddress: '789 High St, Gweru', registeredBy: 'dummy_user_id', registrationDate: new Date().toISOString(),
            status: 'Discharged', financials: { totalBill: 120.00, amountPaid: 120.00, balance: 0.00 }
        },
    ];
    const batch = db.batch();
    patients.forEach(p => {
        const docRef = patientsCol.doc();
        batch.set(docRef, p);
    });
    await batch.commit();

    // Initialize the counter after seeding patients
    const counterRef = db.collection('counters').doc('patients');
    await counterRef.set({ lastNumber: patients.length });
    console.log(`Patient counter initialized to ${patients.length}.`);

    console.log("Patients seeded successfully.");
}

const seedInventory = async () => {
    console.log("Checking inventory...");
    const inventoryCol = db.collection("inventory");
    const snapshot = await inventoryCol.get();
    if (!snapshot.empty) {
        console.log("Inventory already seeded.");
        return;
    }

    console.log("Seeding inventory...");
    const items = [
        { name: 'Paracetamol 500mg (strip)', category: 'Painkiller', quantity: 200, unitPrice: 1.50, lowStockThreshold: 50 },
        { name: 'Amoxicillin 250mg (strip)', category: 'Antibiotic', quantity: 150, unitPrice: 5.00, lowStockThreshold: 30 },
        { name: 'Ibuprofen 200mg (bottle)', category: 'Painkiller', quantity: 80, unitPrice: 4.20, lowStockThreshold: 20 },
        { name: 'Cough Syrup (100ml)', category: 'Cold & Flu', quantity: 120, unitPrice: 3.00, lowStockThreshold: 40 },
        { name: 'Band-Aids (box)', category: 'First Aid', quantity: 300, unitPrice: 2.50, lowStockThreshold: 100 },
    ];
    const batch = db.batch();
    items.forEach(item => {
        const docRef = inventoryCol.doc();
        batch.set(docRef, { 
            ...item, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    await batch.commit();
    console.log("Inventory seeded successfully.");
};


export const seedDatabase = async () => {
  console.log("--- Starting Database Seeding ---");
  await seedWards();
  await seedUsers();
  await seedDepartments();
  await seedPriceList();
  await seedPatients();
  await seedInventory();
  // Add calls to seed other collections like patients, notes etc. if needed
  console.log("--- Database Seeding Finished ---");
};