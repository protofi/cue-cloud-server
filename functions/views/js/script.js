const auth = firebase.auth()

document.getElementById('signup-form').addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('signup')

    const email = "tobiasharbo@gmail.com";
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

document.getElementById('signin-form').addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('signin')

    const email = "tobiasharbo@gmail.com";
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

document.getElementById('signout').addEventListener('click', (event) => {
    event.preventDefault();
    auth.signOut()
})

auth.onAuthStateChanged(user => {
    console.log(user)
})