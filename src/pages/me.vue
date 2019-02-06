<template>
    
    <v-container>

        <v-card>

            <v-container>

                <h2>

                    {{ $store.getters['auth/user'].email }}
                       
                </h2>
        
            </v-container>

        </v-card>

        <v-card>

            <v-container>

                {{ $store.getters['auth/user'].ra }}
            
            </v-container>

        </v-card>

    </v-container>

</template>

<script>
export default {
    
}
</script>
