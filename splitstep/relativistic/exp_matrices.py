import numpy as np
from typing import List, Union


def get_exp_p(dt: float, 
              p: List[np.ndarray], m: float, 
              c: float = 137.036, 
              hbar: float = 1.0) -> List[List[Union[np.ndarray, float]]]:
    exp, sinh = np.exp, np.sinh
    I = 1.0j
    mc = m*c
    cdt_hbar = c*dt/hbar
    exp_p = [[0, 0, 0, 0] for i in range(4)]
    if len(p) == 1:
        px, py, pz = p[0], 0.0, 0.0
        p2 = px**2
    if len(p) == 2:
        px, py, pz = p[0], p[1], 0.0
        p2 = px**2 + py**2
    if len(p) == 3:
        px, py, pz = p[0], p[1], p[2]
        p2 = px**2 + py**2 + pz**2
    # exp p start
    exp_p[0][0] = (-cdt_hbar**2*(mc**2 + p2))**(-0.5)*(0.5*pz**2*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**4*(I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)*exp(0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5) + 0.5*(px - I*py)*(px + I*py)*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**4*(I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)*exp(0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5) - 0.5*(pz**2 + (px - I*py)*(px + I*py))*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**5*exp(1.5*(-cdt_hbar**2*(mc**2 + p2))**0.5))*exp(-1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5)/((pz**2 + (px - I*py)*(px + I*py))*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**4)
    exp_p[0][1] = 0
    exp_p[0][2] = 0.5*I*cdt_hbar*pz*(-cdt_hbar**2*(mc**2 + p2))**(-0.5)*(pz**2*(-I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)**2 + (px - I*py)*(px + I*py)*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**2)*((-I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)**6*exp(0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5) - (I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**6*exp(1.5*(-cdt_hbar**2*(mc**2 + p2))**0.5))*exp(-1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5)/((pz**2 + (px - I*py)*(px + I*py))*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**8)
    exp_p[0][3] = 1.0*cdt_hbar*(0.5*cdt_hbar**3*mc**3*px*(-cdt_hbar**2*(mc**2 + p2))**4.5*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) - 0.5*cdt_hbar**3*mc**3*px*(-cdt_hbar**2*(mc**2 + p2))**4.5 - 0.5*I*cdt_hbar**3*mc**3*py*(-cdt_hbar**2*(mc**2 + p2))**4.5*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) + 0.5*I*cdt_hbar**3*mc**3*py*(-cdt_hbar**2*(mc**2 + p2))**4.5 + 1.5*I*cdt_hbar**2*mc**2*px*(-cdt_hbar**2*(mc**2 + p2))**5.0*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) - 1.5*I*cdt_hbar**2*mc**2*px*(-cdt_hbar**2*(mc**2 + p2))**5.0 + 1.5*cdt_hbar**2*mc**2*py*(-cdt_hbar**2*(mc**2 + p2))**5.0*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) - 1.5*cdt_hbar**2*mc**2*py*(-cdt_hbar**2*(mc**2 + p2))**5.0 - 1.5*cdt_hbar*mc*px*(-cdt_hbar**2*(mc**2 + p2))**5.5*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) + 1.5*cdt_hbar*mc*px*(-cdt_hbar**2*(mc**2 + p2))**5.5 + 1.5*I*cdt_hbar*mc*py*(-cdt_hbar**2*(mc**2 + p2))**5.5*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) - 1.5*I*cdt_hbar*mc*py*(-cdt_hbar**2*(mc**2 + p2))**5.5 - 0.5*I*px*(-cdt_hbar**2*(mc**2 + p2))**6.0*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) + 0.5*I*px*(-cdt_hbar**2*(mc**2 + p2))**6.0 - 0.5*py*(-cdt_hbar**2*(mc**2 + p2))**6.0*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) + 0.5*py*(-cdt_hbar**2*(mc**2 + p2))**6.0)*exp(-0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5)/(1.0*I*cdt_hbar**3*mc**3*(-cdt_hbar**2*(mc**2 + p2))**5.0 - 3.0*cdt_hbar**2*mc**2*(-cdt_hbar**2*(mc**2 + p2))**5.5 - 3.0*I*cdt_hbar*mc*(-cdt_hbar**2*(mc**2 + p2))**6.0 + 1.0*(-cdt_hbar**2*(mc**2 + p2))**6.5)
    exp_p[1][0] = 0
    exp_p[1][1] = 0.5*(cdt_hbar**2*(-mc**2 - p2))**(-0.5)*(I*cdt_hbar*mc*exp(0.5*(cdt_hbar**2*(-mc**2 - p2))**0.5) - I*cdt_hbar*mc*exp(1.5*(cdt_hbar**2*(-mc**2 - p2))**0.5) + (cdt_hbar**2*(-mc**2 - p2))**0.5*exp(0.5*(cdt_hbar**2*(-mc**2 - p2))**0.5) + (cdt_hbar**2*(-mc**2 - p2))**0.5*exp(1.5*(cdt_hbar**2*(-mc**2 - p2))**0.5))*exp(-1.0*(cdt_hbar**2*(-mc**2 - p2))**0.5)
    exp_p[1][2] = 0.5*I*cdt_hbar*(-cdt_hbar**2*(mc**2 + p2))**(-0.5)*(px + I*py)*(pz**2*(-I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)**2 + (px - I*py)*(px + I*py)*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**2)*((-I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)**6*exp(0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5) - (I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**6*exp(1.5*(-cdt_hbar**2*(mc**2 + p2))**0.5))*exp(-1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5)/((pz**2 + (px - I*py)*(px + I*py))*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**8)
    exp_p[1][3] = -1.0*cdt_hbar*pz*(0.5*cdt_hbar**3*mc**3*(-cdt_hbar**2*(mc**2 + p2))**4.5*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) - 0.5*cdt_hbar**3*mc**3*(-cdt_hbar**2*(mc**2 + p2))**4.5 + 1.5*I*cdt_hbar**2*mc**2*(-cdt_hbar**2*(mc**2 + p2))**5.0*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) - 1.5*I*cdt_hbar**2*mc**2*(-cdt_hbar**2*(mc**2 + p2))**5.0 - 1.5*cdt_hbar*mc*(-cdt_hbar**2*(mc**2 + p2))**5.5*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) + 1.5*cdt_hbar*mc*(-cdt_hbar**2*(mc**2 + p2))**5.5 - 0.5*I*(-cdt_hbar**2*(mc**2 + p2))**6.0*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5) + 0.5*I*(-cdt_hbar**2*(mc**2 + p2))**6.0)*exp(-0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5)/(1.0*I*cdt_hbar**3*mc**3*(-cdt_hbar**2*(mc**2 + p2))**5.0 - 3.0*cdt_hbar**2*mc**2*(-cdt_hbar**2*(mc**2 + p2))**5.5 - 3.0*I*cdt_hbar*mc*(-cdt_hbar**2*(mc**2 + p2))**6.0 + 1.0*(-cdt_hbar**2*(mc**2 + p2))**6.5)
    exp_p[2][0] = -1.0*I*pz*(-cdt_hbar**2*(mc**2 + p2))**(-0.5)*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)*(I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)*sinh(0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5)/(cdt_hbar*(pz**2 + (px - I*py)*(px + I*py)))
    exp_p[2][1] = -1.0*I*(-cdt_hbar**2*(mc**2 + p2))**(-0.5)*(px - I*py)*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)*(I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)*sinh(0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5)/(cdt_hbar*(pz**2 + (px - I*py)*(px + I*py)))
    exp_p[2][2] = 0.5*(-cdt_hbar**2*(mc**2 + p2))**(-0.5)*(pz**2*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**2 + (px - I*py)*(px + I*py)*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**2)*(-I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5 + (I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)*exp(1.0*(-cdt_hbar**2*(mc**2 + p2))**0.5))*exp(-0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5)/((pz**2 + (px - I*py)*(px + I*py))*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)**2)
    exp_p[2][3] = 0
    exp_p[3][0] = -1.0*I*(-cdt_hbar**2*(mc**2 + p2))**(-0.5)*(px + I*py)*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)*(I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)*sinh(0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5)/(cdt_hbar*(pz**2 + (px - I*py)*(px + I*py)))
    exp_p[3][1] = 1.0*I*pz*(-cdt_hbar**2*(mc**2 + p2))**(-0.5)*(I*cdt_hbar*mc - (-cdt_hbar**2*(mc**2 + p2))**0.5)*(I*cdt_hbar*mc + (-cdt_hbar**2*(mc**2 + p2))**0.5)*sinh(0.5*(-cdt_hbar**2*(mc**2 + p2))**0.5)/(cdt_hbar*(pz**2 + (px - I*py)*(px + I*py)))
    exp_p[3][2] = 0
    exp_p[3][3] = 0.5*(cdt_hbar**2*(-mc**2 - p2))**(-2.0)*(I*cdt_hbar*mc*(cdt_hbar**2*(-mc**2 - p2))**1.5*exp((cdt_hbar**2*(-mc**2 - p2))**0.5) - I*cdt_hbar*mc*(cdt_hbar**2*(-mc**2 - p2))**1.5 + (cdt_hbar**2*(-mc**2 - p2))**2.0*exp((cdt_hbar**2*(-mc**2 - p2))**0.5) + (cdt_hbar**2*(-mc**2 - p2))**2.0)*exp(-0.5*(cdt_hbar**2*(-mc**2 - p2))**0.5)
    # exp p end
    return exp_p


def get_exp_vector_potential(dt: float, 
                             A: List[np.ndarray], m: float, 
                             hbar: float = 1.0
                            ) -> List[List[Union[np.ndarray, float]]]:
    Ax, Ay, Az = A
    A2 = Ax*Ax + Ay*Ay + Az*Az
    dt_hbar = dt/hbar
    I = 1.0j
    cosh, sinh = np.cosh, np.sinh
    exp_vector_potential = [[0, 0, 0, 0] for i in range(4)]
    # exp potential start
    exp_vector_potential[0][0] = 1.0*cosh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector_potential[0][1] = 0
    exp_vector_potential[0][2] = 1.0*I*Az*dt_hbar*(-A2*dt_hbar**2)**(-0.5)*sinh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector_potential[0][3] = 1.0*dt_hbar*(-A2*dt_hbar**2)**(-0.5)*(I*Ax + Ay)*sinh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector_potential[1][0] = 0
    exp_vector_potential[1][1] = 1.0*cosh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector_potential[1][2] = 1.0*dt_hbar*(-A2*dt_hbar**2)**(-0.5)*(I*Ax - Ay)*sinh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector_potential[1][3] = -1.0*I*Az*dt_hbar*(-A2*dt_hbar**2)**(-0.5)*sinh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector_potential[2][0] = -1.0*I*Az*(-A2*dt_hbar**2)**0.5*sinh(0.25*(-A2*dt_hbar**2)**0.5)/(A2*dt_hbar)
    exp_vector_potential[2][1] = -1.0*(-A2*dt_hbar**2)**0.5*(I*Ax + Ay)*sinh(0.25*(-A2*dt_hbar**2)**0.5)/(dt_hbar*(Ax**2 + Ay**2 + Az**2))
    exp_vector_potential[2][2] = 1.0*cosh(0.25*(-A2*dt_hbar**2)**0.5)
    exp_vector_potential[2][3] = 0
    exp_vector_potential[3][0] = -1.0*(-A2*dt_hbar**2)**0.5*(I*Ax - Ay)*sinh(0.25*(-A2*dt_hbar**2)**0.5)/(dt_hbar*(Ax**2 + Ay**2 + Az**2))
    exp_vector_potential[3][1] = 1.0*I*Az*(-A2*dt_hbar**2)**0.5*sinh(0.25*(-A2*dt_hbar**2)**0.5)/(A2*dt_hbar)
    exp_vector_potential[3][2] = 0
    exp_vector_potential[3][3] = 1.0*cosh(0.25*(-A2*dt_hbar**2)**0.5)
    # exp potential end
    return exp_vector_potential

