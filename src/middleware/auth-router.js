
export default function({ store, redirect, route })
{
    isAdmin(store) && route.name == 'signin' ? redirect('/admin') : ''
    !isGuest(store) && route.name == 'signin' ? redirect('/') : ''

    isGuest(store) && isAdminRoute(route) ? redirect(`/signin?redirect=${route.fullPath}`) : ''
    !isGuest(store) && isAdminRoute(route) && !isAdmin(store) ? redirect('/') : ''
}

function isAdminRoute(route)
{
    const adminPaths = new RegExp('^(?!\/(admin).*$).*')
    return !(adminPaths.test(route.fullPath))
}

function isGuest(store)
{
    return store.getters['auth/isGuest']
}

function isAdmin(store)
{
    return store.getters['auth/isAdmin']
}