export default function({ store, redirect, route })
{
    store.state.user != null && route.name == 'signin' ? redirect('/admin') : ''
    store.state.user == null && isAdminRoute(route) ? redirect('/signin') : ''
}
  
function isAdminRoute(route)
{
    const adminPaths = new RegExp('^(?!\/(admin).*$).*')
    return !(adminPaths.test(route.fullPath))
}