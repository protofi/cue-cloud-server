<template>
    
    <v-dialog v-model="visible" max-width="400px">
        
        <v-card>

            <v-card-title
                class="headline"
            >
                <slot name="headliner">Header</slot>
            
            </v-card-title>

            <slot></slot>

            <v-card-text v-if="this.$slots['body']">

                <slot name="body"></slot>

            </v-card-text>

            <v-card-actions v-if="actions">

                <v-spacer></v-spacer>
    
                <v-btn
                    v-if="cancable"
                    color="cue-green-7 darken-1"
                    flat
                    @click="visible = false"
                >
                    CANCEL
                </v-btn>
                
                <v-btn
                    
                    color="cue-green-7 darken-1"
                    flat
                    type="submit"
                    @click.stop="confirm"
                    :loading="loading"
                >
                    OK
                </v-btn>

            </v-card-actions>

        </v-card>
    
    </v-dialog>
    
</template>

<script>
export default {
    props : [
        'show',
        'cancable',
        'actions',
        'loading'
	],
    data() {
        return {
            visible : false,
        }
    },
    methods : {
        confirm ()
        {   
            this.$emit('confirmed', event, this.$refs.form)
        },
    },
    watch : {
        show (show)
        {
            this.visible = show
        },
        visible (visible)
        {
            if(!visible)
                this.$emit('dismissed')
        }
    },
}
</script>

