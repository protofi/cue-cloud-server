<template>
    <v-container>

        <h2>
            {{$store.getters['auth/get'].email}}            
        </h2>

    </v-container>

</template>

<script>
export default {
    
}
</script>
