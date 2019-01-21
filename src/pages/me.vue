<template>
    
    <v-container>

        <h2>
            {{$store.getters['auth/user'].email}}            
        </h2>

    </v-container>

</template>

<script>
export default {
    
}
</script>
