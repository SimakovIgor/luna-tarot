function c(t){if(!t)return"";const e=t.replace(/\*\*(.+?)\*\*/g,"$1").replace(/^[🌙✦☽\s]+/u,"").trim(),n=e.match(/^(.*?[.!?…])(\s|$)/);return(n?n[1]:e.split(`
`)[0]).trim()}export{c as e};
