<template>
    
    <div>

        <v-toolbar
            color="cyan"
            dark
            tabs
        >

			<v-toolbar-title>Users</v-toolbar-title>

			<v-spacer></v-spacer>

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
                        
                            </v-flex>

                        </v-layout>

                    </v-layout>

        		</v-card>
				
			</v-tab-item>

		</v-tabs-items>

        

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
                userClaims : {},
                
                tab: null,
                items: [
                    'all', 'users', 'admins'
                ],
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
            },

            notAdmins()
            {
                return this.users.filter((user) => {
                    return !user.data.claims.isAdmin && !user.data.claims.isSuperAdmin
                })
            },

            admins()
            {
                return this.users.filter((user) => {
                    return user.data.claims.isAdmin || user.data.claims.isSuperAdmin
                })
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
