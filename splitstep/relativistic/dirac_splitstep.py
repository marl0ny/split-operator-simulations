from .. import SplitStepMethod
import numpy as np
from typing import Tuple, Union, List

class DiracSplitStepMethod(SplitStepMethod):
    """
    The dirac splitstep method. Unlike with the other classes that use metric units,
    natural units are used, where hbar = c = 1.

    References:

    Shankar R. (1994). The Dirac Equation. In Principles of Quantum Mechanics,
    chapter 20. Plenum Press.

    https://en.wikipedia.org/wiki/Dirac_equation

    """

    def __init__(self, potential: np.ndarray,
                 dimensions: Tuple[float, ...],
                 timestep: Union[float, np.complex128] = 1.0,
                 m: float = 1.0):
        self._exp_p = None
        self._exp_V = None
        self._m = m
        SplitStepMethod.__init__(self, potential, dimensions, timestep)

    def set_timestep(self, timestep: Union[float, np.complex128]) -> None:
        p_list = []
        for i, d in enumerate(self.V.shape):
            freq = np.pi*np.fft.fftfreq(d)
            freq[0] = 1e-17
            p_list.append(np.complex128(2.0)*freq*d/self._dim[i])
        p = np.meshgrid(*p_list)
        self._dt = timestep
        dt = np.complex128(self._dt)
        I = 1.0j
        mc2 = np.complex128(self._m)
        exp, sinh = np.exp, np.sinh
        exp_kinetic = [[0, 0, 0, 0] for i in range(4)]
        if len(p) == 1:
            px, py, pz = p[0], 0.0, 0.0
            p2 = px**2
        if len(p) == 2:
            px, py, pz = 0.0, p[0], p[1]
            p2 = py**2 + pz**2
        if len(p) == 3:
            px, py, pz = p[0], p[1], p[2]
            p2 = px**2 + py**2 + pz**2
        exp_kinetic[0][0] =  0.5*(dt**2*(-mc2**2 - p2))**(-0.5)*(I*dt*mc2*exp(0.5*(dt**2*(-mc2**2 - p2))**0.5) - I*dt*mc2*exp(1.5*(dt**2*(-mc2**2 - p2))**0.5) + (dt**2*(-mc2**2 - p2))**0.5*exp(0.5*(dt**2*(-mc2**2 - p2))**0.5) + (dt**2*(-mc2**2 - p2))**0.5*exp(1.5*(dt**2*(-mc2**2 - p2))**0.5))*exp(-1.0*(dt**2*(-mc2**2 - p2))**0.5)
        exp_kinetic[0][1] =  0
        exp_kinetic[0][2] =  1.0*dt*pz*(-0.5*I*dt**2*mc2**2*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) + 0.5*I*dt**2*mc2**2 + 1.0*dt*mc2*(dt**2*(-mc2**2 - p2))**0.5*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) - 1.0*dt*mc2*(dt**2*(-mc2**2 - p2))**0.5 + 0.5*I*(dt**2*(-mc2**2 - p2))**1.0*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) - 0.5*I*(dt**2*(-mc2**2 - p2))**1.0)*exp(-0.5*(dt**2*(-mc2**2 - p2))**0.5)/(1.0*dt**2*mc2**2*(dt**2*(-mc2**2 - p2))**0.5 + 2.0*I*dt*mc2*(dt**2*(-mc2**2 - p2))**1.0 - 1.0*(dt**2*(-mc2**2 - p2))**1.5)
        exp_kinetic[0][3] =  1.0*dt*(0.5*dt**3*mc2**3*px*(-dt**2*(mc2**2 + p2))**4.5*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) - 0.5*dt**3*mc2**3*px*(-dt**2*(mc2**2 + p2))**4.5 - 0.5*I*dt**3*mc2**3*py*(-dt**2*(mc2**2 + p2))**4.5*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) + 0.5*I*dt**3*mc2**3*py*(-dt**2*(mc2**2 + p2))**4.5 + 1.5*I*dt**2*mc2**2*px*(-dt**2*(mc2**2 + p2))**5.0*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) - 1.5*I*dt**2*mc2**2*px*(-dt**2*(mc2**2 + p2))**5.0 + 1.5*dt**2*mc2**2*py*(-dt**2*(mc2**2 + p2))**5.0*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) - 1.5*dt**2*mc2**2*py*(-dt**2*(mc2**2 + p2))**5.0 - 1.5*dt*mc2*px*(-dt**2*(mc2**2 + p2))**5.5*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) + 1.5*dt*mc2*px*(-dt**2*(mc2**2 + p2))**5.5 + 1.5*I*dt*mc2*py*(-dt**2*(mc2**2 + p2))**5.5*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) - 1.5*I*dt*mc2*py*(-dt**2*(mc2**2 + p2))**5.5 - 0.5*I*px*(-dt**2*(mc2**2 + p2))**6.0*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) + 0.5*I*px*(-dt**2*(mc2**2 + p2))**6.0 - 0.5*py*(-dt**2*(mc2**2 + p2))**6.0*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) + 0.5*py*(-dt**2*(mc2**2 + p2))**6.0)*exp(-0.5*(-dt**2*(mc2**2 + p2))**0.5)/(1.0*I*dt**3*mc2**3*(-dt**2*(mc2**2 + p2))**5.0 - 3.0*dt**2*mc2**2*(-dt**2*(mc2**2 + p2))**5.5 - 3.0*I*dt*mc2*(-dt**2*(mc2**2 + p2))**6.0 + 1.0*(-dt**2*(mc2**2 + p2))**6.5)
        exp_kinetic[1][0] =  0
        exp_kinetic[1][1] =  0.5*(dt**2*(-mc2**2 - p2))**(-0.5)*(I*dt*mc2*exp(0.5*(dt**2*(-mc2**2 - p2))**0.5) - I*dt*mc2*exp(1.5*(dt**2*(-mc2**2 - p2))**0.5) + (dt**2*(-mc2**2 - p2))**0.5*exp(0.5*(dt**2*(-mc2**2 - p2))**0.5) + (dt**2*(-mc2**2 - p2))**0.5*exp(1.5*(dt**2*(-mc2**2 - p2))**0.5))*exp(-1.0*(dt**2*(-mc2**2 - p2))**0.5)
        exp_kinetic[1][2] =  1.0*dt*(-0.5*I*dt**2*mc2**2*px*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) + 0.5*I*dt**2*mc2**2*px + 0.5*dt**2*mc2**2*py*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) - 0.5*dt**2*mc2**2*py + 1.0*dt*mc2*px*(dt**2*(-mc2**2 - p2))**0.5*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) - 1.0*dt*mc2*px*(dt**2*(-mc2**2 - p2))**0.5 + 1.0*I*dt*mc2*py*(dt**2*(-mc2**2 - p2))**0.5*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) - 1.0*I*dt*mc2*py*(dt**2*(-mc2**2 - p2))**0.5 + 0.5*I*px*(dt**2*(-mc2**2 - p2))**1.0*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) - 0.5*I*px*(dt**2*(-mc2**2 - p2))**1.0 - 0.5*py*(dt**2*(-mc2**2 - p2))**1.0*exp(1.0*(dt**2*(-mc2**2 - p2))**0.5) + 0.5*py*(dt**2*(-mc2**2 - p2))**1.0)*exp(-0.5*(dt**2*(-mc2**2 - p2))**0.5)/(1.0*dt**2*mc2**2*(dt**2*(-mc2**2 - p2))**0.5 + 2.0*I*dt*mc2*(dt**2*(-mc2**2 - p2))**1.0 - 1.0*(dt**2*(-mc2**2 - p2))**1.5)
        exp_kinetic[1][3] =  -1.0*dt*pz*(0.5*dt**3*mc2**3*(-dt**2*(mc2**2 + p2))**4.5*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) - 0.5*dt**3*mc2**3*(-dt**2*(mc2**2 + p2))**4.5 + 1.5*I*dt**2*mc2**2*(-dt**2*(mc2**2 + p2))**5.0*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) - 1.5*I*dt**2*mc2**2*(-dt**2*(mc2**2 + p2))**5.0 - 1.5*dt*mc2*(-dt**2*(mc2**2 + p2))**5.5*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) + 1.5*dt*mc2*(-dt**2*(mc2**2 + p2))**5.5 - 0.5*I*(-dt**2*(mc2**2 + p2))**6.0*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5) + 0.5*I*(-dt**2*(mc2**2 + p2))**6.0)*exp(-0.5*(-dt**2*(mc2**2 + p2))**0.5)/(1.0*I*dt**3*mc2**3*(-dt**2*(mc2**2 + p2))**5.0 - 3.0*dt**2*mc2**2*(-dt**2*(mc2**2 + p2))**5.5 - 3.0*I*dt*mc2*(-dt**2*(mc2**2 + p2))**6.0 + 1.0*(-dt**2*(mc2**2 + p2))**6.5)
        exp_kinetic[2][0] =  -1.0*I*pz*(-dt**2*(mc2**2 + p2))**(-0.5)*(I*dt*mc2 - (-dt**2*(mc2**2 + p2))**0.5)*(I*dt*mc2 + (-dt**2*(mc2**2 + p2))**0.5)*sinh(0.5*(-dt**2*(mc2**2 + p2))**0.5)/(dt*(pz**2 + (px - I*py)*(px + I*py)))
        exp_kinetic[2][1] =  -1.0*I*(-dt**2*(mc2**2 + p2))**(-0.5)*(px - I*py)*(I*dt*mc2 - (-dt**2*(mc2**2 + p2))**0.5)*(I*dt*mc2 + (-dt**2*(mc2**2 + p2))**0.5)*sinh(0.5*(-dt**2*(mc2**2 + p2))**0.5)/(dt*(pz**2 + (px - I*py)*(px + I*py)))
        exp_kinetic[2][2] =  0.5*(-dt**2*(mc2**2 + p2))**(-0.5)*(pz**2*(-I*dt*mc2 + (-dt**2*(mc2**2 + p2))**0.5)**2 + (px - I*py)*(px + I*py)*(I*dt*mc2 - (-dt**2*(mc2**2 + p2))**0.5)**2)*(-I*dt*mc2 + (-dt**2*(mc2**2 + p2))**0.5 + (I*dt*mc2 + (-dt**2*(mc2**2 + p2))**0.5)*exp(1.0*(-dt**2*(mc2**2 + p2))**0.5))*exp(-0.5*(-dt**2*(mc2**2 + p2))**0.5)/((pz**2 + (px - I*py)*(px + I*py))*(I*dt*mc2 - (-dt**2*(mc2**2 + p2))**0.5)**2)
        exp_kinetic[2][3] =  0
        exp_kinetic[3][0] =  -1.0*I*(-dt**2*(mc2**2 + p2))**(-0.5)*(px + I*py)*(I*dt*mc2 - (-dt**2*(mc2**2 + p2))**0.5)*(I*dt*mc2 + (-dt**2*(mc2**2 + p2))**0.5)*sinh(0.5*(-dt**2*(mc2**2 + p2))**0.5)/(dt*(pz**2 + (px - I*py)*(px + I*py)))
        exp_kinetic[3][1] =  1.0*I*pz*(-dt**2*(mc2**2 + p2))**(-0.5)*(I*dt*mc2 - (-dt**2*(mc2**2 + p2))**0.5)*(I*dt*mc2 + (-dt**2*(mc2**2 + p2))**0.5)*sinh(0.5*(-dt**2*(mc2**2 + p2))**0.5)/(dt*(pz**2 + (px - I*py)*(px + I*py)))
        exp_kinetic[3][2] =  0
        exp_kinetic[3][3] =  0.5*(dt**2*(-mc2**2 - p2))**(-2.0)*(I*dt*mc2*(dt**2*(-mc2**2 - p2))**1.5*exp((dt**2*(-mc2**2 - p2))**0.5) - I*dt*mc2*(dt**2*(-mc2**2 - p2))**1.5 + (dt**2*(-mc2**2 - p2))**2.0*exp((dt**2*(-mc2**2 - p2))**0.5) + (dt**2*(-mc2**2 - p2))**2.0)*exp(-0.5*(dt**2*(-mc2**2 - p2))**0.5)
        self._exp_p = exp_kinetic
        V = self.V
        exp_V = [[1.0*exp(-0.25*I*V*dt), 0, 0, 0], 
                 [0, 1.0*exp(-0.25*I*V*dt), 0, 0], 
                 [0, 0, 1.0*exp(-0.25*I*V*dt), 0], 
                 [0, 0, 0, 1.0*exp(-0.25*I*V*dt)]]
        self._exp_V = exp_V

    def __call__(self, psi: List[np.ndarray]):
        psi = list_mat_mul_4(self._exp_V, psi)
        psi_p = [np.fft.fftn(psi[i]) for i in range(4)]
        psi_p = list_mat_mul_4(self._exp_p, psi_p)
        psi = [np.fft.ifftn(psi_p[i]) for i in range(4)]
        psi = list_mat_mul_4(self._exp_V, psi)
        if self._norm:
            pass
        return psi


def list_mat_mul_4(A, x):
    b = [0, 0, 0, 0]
    for i in range(4):
        for j in range(4):
            b[i] += np.complex128(A[i][j])*x[j]
    return b