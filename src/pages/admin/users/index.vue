<template>
    <v-container>
        <v-layout column fill-height justify-center>
            
            <v-layout row wrap>
                
                <v-flex xs12 sm6 md6 lg6 xl6>

                    <v-card>
			
                        <v-toolbar color="light-blue" dark>

                            <v-toolbar-title>Users</v-toolbar-title>

                        </v-toolbar>

                        <v-list two-line subheader>
                        
                            <v-list-tile
                                v-for="user in users"
                                :key="user.id"
                                :to="user.path"
                                avatar
                                router
                            >
                                <v-list-tile-avatar>
                                    <v-icon class="grey lighten-1 white--text">account_circle</v-icon>
                                </v-list-tile-avatar>

                                <v-list-tile-content>
                                    
                                    <v-list-tile-title>{{ user.data.name ? user.data.name : user.id }}</v-list-tile-title>
                                    <v-list-tile-sub-title></v-list-tile-sub-title>

                                </v-list-tile-content>

                                <v-list-tile-action v-if="user.data.claims">
                                    
                                    <v-layout>

                                        <v-icon v-if="user.data.claims.isSuperAdmin">{{roles.isSuperAdmin.icon}}</v-icon>
                                        <v-icon v-else-if="user.data.claims.isAdmin">{{roles.isAdmin.icon}}</v-icon>

                                    </v-layout>

                                </v-list-tile-action>

                                <v-list-tile-action v-if="$store.getters['auth/isSuperAdmin']">

                                    <v-layout>

                                        <v-btn
                                            icon
                                            ripple
                                            @click.stop.prevent="promotionDialog(user)"
                                        >
                                            <v-icon
                                                color="grey"
                                            >
                                                verified_user
                                            </v-icon>

                                        </v-btn>
                                        
                                    </v-layout>
                                         
                                </v-list-tile-action>

                            </v-list-tile>

                        </v-list>

                    </v-card>
        
                </v-flex>

            </v-layout>

        </v-layout>

        <v-dialog v-model="showUserPromotionDialog" max-width="400px">

            <v-card v-if="userToBePromoted">

                <v-card-title>

                    <span class="headline">Promote User</span>
                
                </v-card-title>

                <v-card-text>

                    <v-form ref="userPromotionForm">

                        <v-container grid-list-md>

                            <v-layout wrap>

                                <v-flex xs12>
                                    <v-text-field
                                        label="User ID"
                                        disabled
                                        name="id"
                                        v-model="userToBePromoted.id">
                                    </v-text-field>
                                </v-flex>

                                <v-flex xs12>
                                    <v-text-field
                                        label="Name"
                                        disabled
                                        v-model="userToBePromoted.data.name">
                                    </v-text-field>
                                </v-flex>

                                <v-flex xs12 row>
                                   
                                    <v-checkbox
                                        v-for="(role, key) in roles"
                                        :key="key"
                                        :label="role.name"
                                        v-model="userClaims[key]"
                                    ></v-checkbox>

                                </v-flex>

                            </v-layout>

                        </v-container>

                        <v-alert
                            :value="userPromotionError"
                            color="error"
                            icon="warning"
                            transition="scale-transition"
                            outline
                        >
                            {{ userPromotionErrorMessage }}

                        </v-alert>

                    </v-form>

                </v-card-text>

                <v-card-actions>

                    <v-spacer></v-spacer>

                    <v-btn color="blue darken-1" flat @click="showUserPromotionDialog = false">Close</v-btn>
                    <v-btn color="blue darken-1" flat type="submit" @click="userClaimsubmit">Promote</v-btn>
                
                </v-card-actions>

            </v-card>
            
        </v-dialog>

    </v-container>

</template>

<script>

    import { firestore } from '~/plugins/firebase.js'

    export default {
        data () {
            return {
                checkbox: true,
                userDocs : null,
                roles : {
                    isAdmin      : { name : 'Admin',       icon : 'grade'},
                    isSuperAdmin : { name : 'Super Admin', icon : 'gavel'}
                },
                showUserPromotionDialog: false,

                userToBePromoted : null,
                userPromotionErrorMessage : '',
                userPromotionError : null,
                userClaims : {}
            }
        },
        watch : {
            userToBePromoted(user) {
                if(!user) this.userClaims = {}
                else this.userClaims = user.data.claims
            },

        },
        created ()
        {
            firestore.collection('users')
                .onSnapshot(({ docs }) => {
                    
                    this.userDocs = docs
                    return

                }, error => {
                    console.log(error.message)
                })
        },

        computed : {
            users()
            {
                if(!this.userDocs) return

                const users = []
                
                this.userDocs.forEach(doc => {
                
                    const user = {
                        id      : doc.id,
                        path    : `/admin/users/${doc.id}`,
                        data    : doc.data()
                    }

                    users.push(user)
                })

                return users
            }
        },
        methods : {
            promotionDialog(user)
            {
                this.showUserPromotionDialog = true
                this.userToBePromoted = user
            },
            userClaimsubmit(e)
            {
                e.preventDefault()

                firestore.collection('users').doc(this.userToBePromoted.id).set({
                    claims : this.userClaims
                }, {
                    merge : true
                }).catch(error => {
                    console.log(error.message)
                })
            }
        }
    }
</script>

<style>

</style>
