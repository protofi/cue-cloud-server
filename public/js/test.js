const auth = firebase.auth()
const db = firebase.firestore();


const settings = {timestampsInSnapshots: true};
db.settings(settings);

document.getElementById('delete-sensors').addEventListener('submit', (event) => {
    event.preventDefault()

    axios.delete('/api/sensors')
    .then(() => {
        console.log('DELETED')
    }).catch((error) => {
        console.log(error)
    })
})