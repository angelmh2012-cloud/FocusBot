function calcularPupila(mouseX, mouseY, ojoX, ojoY, maxRadio){

    const deltaX  = mouseX - ojoX;
    const deltaY = mouseY - ojoY;
    
    const angulo = Math.atan2(deltaX, deltaY);
    const distancia = Math.hypot(deltaX, deltaY);

    const maxDistancia = Math.min(distancia, maxRadio);

    const objetivoX = Math.sin(angulo) * maxDistancia
    const objetivoY = Math.cos(angulo) * maxDistancia

    return{x: objetivoX, y: objetivoY};

}


function centroElemento(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function obtenerMedidas(element){
    const elemento = document.querySelector(element);

    const computedStyle = window.getComputedStyle(elemento);

    const width = parseFloat(computedStyle.width);
    const height = parseFloat(computedStyle.height);

    return {
        h: height,
        w: width
    }

}

document.addEventListener('mousemove', (evento) =>{

    function transform(pupila, x, y){
        pupila.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
    

const mouseX = evento.clientX;
const mouseY = evento.clientY;

const pupila = document.getElementById('pupila')
// const pupila2 = document.getElementById('pupila2')



const {x: ojoX, y: ojoY} = centroElemento(pupila);
// const {x: ojoX2, y: ojoY2} = centroElemento(pupila2);


const {h: pupilaH, w: pupilaW} = obtenerMedidas('.pupila')
const {h: eyeH, w: eyeW} = obtenerMedidas('.eye')

// const {h: pupilaH2, w: pupilaW2} = obtenerMedidas('.pupila')
// const {h: eyeH2, w: eyeW2} = obtenerMedidas('.eye')


const maxRadio = Math.min((eyeW - pupilaW) / 2, (eyeH - pupilaH) / 2)
// const maxRadio2 = Math.min((eyeW2 - pupilaW2) / 2, (eyeH2 - pupilaH2) / 2)


const {x, y} = calcularPupila(mouseX, mouseY, ojoX, ojoY, maxRadio);
// const {x: x2, y: y2} = calcularPupila(mouseX, mouseY, ojoX2, ojoY2, maxRadio2);


transform(pupila, x, y)
transform(pupila2, x2, y2)


});



