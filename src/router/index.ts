import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Editor from '../views/Editor.vue'
import Generate from '../views/Generate.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/editor/:id', component: Editor, props: true },
  { path: '/generate/:id', component: Generate, props: true }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
