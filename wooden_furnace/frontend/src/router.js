import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import SessionsView from './views/SessionsView.vue';
import ReportsView from './views/ReportsView.vue';
import PartsView from './views/PartsView.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/parts', component: PartsView},
    { path: '/sessions', component: SessionsView },
    { path: '/reports/:sessionId', component: ReportsView },
    { path: '/reports', component: ReportsView },
    { path: '/', redirect: '/parts' }
  ]
});