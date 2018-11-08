const auth = firebase.auth()
const db = firebase.firestore();
const settings = {timestampsInSnapshots: true};
db.settings(settings);

document.getElementById('signup-form').addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('signup')

    const email = "tobias@mail.com";
    const password = "notsecure123";

    auth
    .createUserWithEmailAndPassword(email, password)
    .catch((error) => {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(error)
    })
})

document.getElementById('change-name-form').addEventListener('submit', (event) => {
    event.preventDefault()

    let name = document.getElementById('change-name-input').value

    let user = firebase.auth().currentUser;

    user.updateProfile({
        displayName: name
    }).then(function() {
    }).catch(function(error) {
    })
})

document.getElementById('signin-form').addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('signin')

    const email = "tobias@mail.com";
    const password = "notsecure123";

    auth
    .signInWithEmailAndPassword(email, password)
    .catch((error) => {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(error)
    })
})

document.getElementById('delete-user').addEventListener('click', event => {
    event.preventDefault();

    const user = auth.currentUser;
    if(!user) return
    
    user.delete().then(function() {
        console.log('deleted')
    }).catch(function(error) {
        console.log(error)
    });
})

document.getElementById('signout').addEventListener('click', (event) => {
    event.preventDefault();
    auth.signOut()
})

auth.onAuthStateChanged(user => {

    if(!user)
    {
        console.log('Signed out');
        return;
    }

    console.log(user)
})

const form = document.getElementById('init-household-form');
form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = form.getElementsByClassName('household-name')[0].value;
    console.log(name)

    const user = auth.currentUser;

    db.collection("households").add({
        name : name,
    }).then((household) => {
        db.collection("households").doc(household.id).collection('members').doc(user.uid).set({
            uid : user.uid,
            name : user.displayName
        });

        db.collection('households').doc(household.id).collection('members').get()
        .then(members => {
            console.log(members.docs.map(doc => doc.data()))
        })
    })
})

// const uid = 'test-user-1'

// db.collection("sensors").where(`users.${uid}.id`, "==", uid)
//     .onSnapshot(function(querySnapshot) {

//         querySnapshot.docChanges().forEach((change) => {
//             if (change.type === "added") {
//                 console.log("New city: ", change.doc.data());
//             }
//             if (change.type === "modified") {
//                 console.log("Modified city: ", change.doc.data());
//             }
//             if (change.type === "removed") {
//                 console.log("Removed city: ", change.doc.data());
//             }
//         });
   
//     });


// let householdDoc = db.collection("households").doc();
// let householdId = householdDoc.getId();

// db.collection('users')
//     .doc(uid).set(
//     {
//         'households': {
//             'id' : householdId
//         }
//     }
// )

// db.collection("households")
//     .doc(householdId).set(
//         {
//             'users' : {
//                 uid : true
//             }
//         }
//     )
