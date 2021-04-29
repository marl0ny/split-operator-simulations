"""
Animation of a particle in 3D Simple Harmonic Oscillator.
"""
from splitstep import SplitStepMethod
import numpy as np

# Constants (Metric Units)
N = 64  # Number of points to use
L = 1e-8  # Extent of simulation (in meters)
X, Y, Z = np.meshgrid(L*np.linspace(-0.5, 0.5 - 1.0/N, N),
                      L*np.linspace(-0.5, 0.5 - 1.0/N, N),
                      L*np.linspace(-0.5, 0.5 - 1.0/N, N))
DX = X[1] - X[0]  # Spatial step size
DT = 5e-17  # timestep in seconds


# The wavefunction
k = 0.0
sigma = 0.056568
# sigma = 3.0
e = (1.0 + 0.0j)*np.exp(2.0j*np.pi*k*X/L)
psi1 = e*np.exp(-((X/L+0.25)/sigma)**2/2.0
                -((Y/L-0.25)/sigma)**2/2.0
                -((Z/L+0.25)/sigma)**2/2.0)
psi2 = e*np.exp(-((X/L-0.25)/sigma)**2/2.0
                -((Y/L+0.25)/sigma)**2/2.0
                -((Z/L-0.25)/sigma)**2/2.0)
psi12 = psi1 + psi2
psi = psi12/np.sqrt(np.sum(psi12*np.conj(psi12)))
data = {'psi': 100.0*psi1/np.sqrt(np.sum(psi1*np.conj(psi1)))}

V = 6*1e-18*((X/L)**2 + (Y/L)**2 + (Z/L)**2) # Simple Harmonic Oscillator
U = SplitStepMethod(V, (L, L, L), DT)


from mayavi import mlab
mlab.figure(1, fgcolor=(1, 1, 1), bgcolor=(0, 0, 0))
plot_data = mlab.pipeline.scalar_field(np.abs(psi))
angle_data = np.angle(psi).T.ravel()
plot_data.image_data.point_data.add_array(angle_data)
plot_data.image_data.point_data.get_array(1).name = 'phase'
plot_data.update()

plot_data2 = mlab.pipeline.set_active_attribute(plot_data, point_scalars='scalar')
contour = mlab.pipeline.contour(plot_data2)
contour2 = mlab.pipeline.set_active_attribute(contour, point_scalars='phase')
mlab.pipeline.surface(contour2, 
                        colormap='hsv'
                        )

@mlab.animate(delay=10)
def animation():
    while (1):
        for _ in range(1):
            data['psi'] = U(data['psi'])
        plot_data.mlab_source.scalars = np.abs(data['psi'])
        np.copyto(angle_data, np.real(data['psi']).T.ravel())
        yield

animation()
mlab.show()
