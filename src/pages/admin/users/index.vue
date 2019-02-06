<template>
    
    <div>

        <v-toolbar
            color="cyan"
            dark
            tabs
        >

			<v-toolbar-title>Users</v-toolbar-title>

			<v-spacer></v-spacer>
            
            <v-menu offset-y>
            
                <v-btn
                    slot="activator"
                    icon
                >
                    <v-icon>playlist_add_check</v-icon>
                
                </v-btn>

                <v-list>

                    <v-list-tile
                        ripple
                        @click.stop="bulkDelete"
                    >
                        <v-list-tile-avatar>
                            <v-progress-circular
                                v-if="deleteLoading"
                                indeterminate
                                color="amber"
                            ></v-progress-circular>
                            <v-icon v-else>delete</v-icon>
                        </v-list-tile-avatar>

                        <v-list-tile-title>
                            Delete
                        </v-list-tile-title>

                    </v-list-tile>

                </v-list>

            </v-menu>

            <!-- <v-tabs
				slot="extension"
				v-model="tab"
				color="cyan"
				align-with-title
			>
				<v-tabs-slider color="white"></v-tabs-slider>

				<v-tab v-for="item in items" :key="item">
				{{ item }}
				</v-tab>
			
			</v-tabs> -->

		</v-toolbar>

        <v-tabs-items v-model="tab">

			<v-tab-item v-for="item in items" :key="item">
				
				<v-card flat>
                    
                    <v-layout column fill-height justify-center>

                        <v-layout row wrap>
                            
                            <v-flex xs12 sm6 md6 lg6 xl6>
                    
                                <v-list two-line subheader>
                                    
                                        <v-list-tile
                                            v-for="user in users"
                                            :key="user.id"
                                            avatar
                                            :to="user.path"
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

                                            <v-list-tile-action @click.prevent="">

                                                <v-checkbox :value="user.id" v-model="selectedUsers"></v-checkbox>

                                            </v-list-tile-action>

                                            <v-list-tile-action v-if="$store.getters['auth/isSuperAdmin']">

                                                <v-layout>

                                                    <v-btn
                                                        icon
                                                        small color="grey darken-1" dark
                                                        ripple
                                                        @click.stop.prevent="promotionDialog(user)"
                                                    >
                                                        <v-icon
                                                        >
                                                            swap_vert
                                                        </v-icon>

                                                    </v-btn>
                                                    
                                                </v-layout>
                                                    
                                            </v-list-tile-action>

                                        </v-list-tile>

                                    </v-list>
                        
                            </v-flex>

                        </v-layout>

                    </v-layout>

        		</v-card>
				
			</v-tab-item>

		</v-tabs-items>
        
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
                                        :value="key"
                                        v-model="userClaims"
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
                    <v-btn color="blue darken-1" flat type="submit" @click="userClaimSubmit">Promote</v-btn>
                
                </v-card-actions>

            </v-card>
            
        </v-dialog>

    </div>

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
                userClaims : [],
                
                selectedUsers : [],
                deleteLoading : false,

                tab: null,
                items: [
                    'all', 'users', 'admins'
                ],
            }
        },
        created ()
        {
            firestore.collection('users')
                .onSnapshot(({ docs }) => {
                    
                    this.userDocs = docs

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
            },

            notAdmins()
            {
                return this.users.filter((user) => {
                    return user.data.claims && !user.data.claims.isAdmin && !user.data.claims.isSuperAdmin
                })
            },

            admins()
            {
                return this.users.filter((user) => {
                    return user.data.claims && (user.data.claims.isAdmin || user.data.claims.isSuperAdmin)
                })
            }
        },
        methods : {
            promotionDialog(user)
            {
                this.showUserPromotionDialog = true
                this.userToBePromoted = user
                
                if(user.data.claims)
                    this.userClaims = Object.keys(user.data.claims)
            },

            async userClaimSubmit(e)
            {
                e.preventDefault()

                let claims = {}
                
                this.userClaims.forEach(claim => {
                    claims[claim] = true
                })

                try
                {
                    await firestore.collection('users').doc(this.userToBePromoted.id).set({
                        claims : claims
                    }, {
                        merge : true
                    })
                }
                catch(e) {
                    console.log(e)
                }

                this.showUserPromotionDialog = false
                this.userToBePromoted = null
                this.userClaims = []
            },

            async bulkDelete()
            {
                this.deleteLoading = true

                try{
                    const res = await this.$axios.delete('/users', {
                        data : {
                            ids : this.selectedUsers
                        }
                    })
                }
                catch(e)
                {
                    console.log(e)
                }

                this.deleteLoading = false
            }
        }
    }
</script>

<style>

</style>
