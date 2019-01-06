<template>

    <div>

    
    </div>

</template>

<script>
    import { firestore } from '~/plugins/firebase.js'


  export default {
    data () {
      return {
      }
    },

    created () {
        firestore.collection("households").get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                // doc.data() is never undefined for query doc snapshots
                console.log(doc.id, " => ", doc.data())
            })
        })
        .catch(error => {
            console.log("Error getting documents: ", error.message)
        })
    }
  }
</script>

<style>

</style>
