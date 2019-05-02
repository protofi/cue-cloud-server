<template>
    
    <v-dialog v-model="visible" max-width="400px">
        
        <v-form
            ref="form"
            >

            <v-card>
    
                <v-card-title
                    class="headline"
                >
                    <slot name="headliner"></slot>
                
                </v-card-title>

                <v-card-text>

                    <slot name="body"></slot>

                </v-card-text>
    
                <v-card-actions>
    
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
                        @click.stop="submit"
                    >
                        
                    </v-btn>
    
                </v-card-actions>
    
            </v-card>
        
        </v-form>

    </v-dialog>
    
</template>

<script>
export default {
    props : [
        'show',
        'cancable'
	],
    data() {
        return {
            visible : false
        }
    },
    methods : {
        submit (event) 
        {   
            event.preventDefault()
            this.$emit('confirm', event, this.$refs.form)
        },
    },
    watch : {
        show (value)
        {
            this.visible = value
        },
        visible (value) 
        {
            if(value == false)
                this.$emit('cancel')
        }
    },
}
</script>

